using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

namespace Task6.server;

public class CircuitHub(CircuitStateService state) : Hub
{
    public List<RoomDto> GetPublicRooms()
    {
        return state.GetPublicRooms();
    }

    public CreateRoomResponseDto CreateRoom(string name, bool isPrivate, string? password)
    {
        var room = state.CreateRoom(name, isPrivate, password);
        return new CreateRoomResponseDto
        {
            Id = room.Id,
            Name = room.Name,
            IsPrivate = room.IsPrivate
        };
    }

    public async Task<JoinRoomResponseDto> JoinRoom(string roomId, string userId, string userName, string? password)
    {
        var room = state.GetRoom(roomId);
        if (room == null)
        {
            throw new HubException("ERR_ROOM_NOT_FOUND");
        }

        if (!string.IsNullOrEmpty(room.Password) && room.Password != password)
        {
            throw new HubException("ERR_WRONG_PASSWORD");
        }

        var assignedName = state.RegisterUser(Context.ConnectionId, roomId, userId, userName);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        await Clients.OthersInGroup(roomId).SendAsync("UserJoined", assignedName);

        return new JoinRoomResponseDto
        {
            AssignedName = assignedName,
            RoomName = room.Name,
            CurrentCircuit = room.CircuitJson,
            Users = state.GetRoomUserNames(roomId),
            IsRunning = room.IsRunning
        };
    }

    public async Task SetRunMode(string roomId, bool running)
    {
        var room = state.GetRoom(roomId);
        if (room == null) return;
        room.IsRunning = running;
        await Clients.OthersInGroup(roomId).SendAsync("RunModeChanged", running);
    }

    public async Task SyncCircuit(string roomId, object circuitData)
    {
        var json = JsonSerializer.Serialize(circuitData);
        state.SaveCircuit(roomId, json);
        await Clients.OthersInGroup(roomId).SendAsync("CircuitUpdated", circuitData);
    }

    public async Task SendChatMessage(string roomId, string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        var trimmed = text.Length > 500 ? text[..500] : text;
        var senderName = state.GetAssignedNameForConnection(Context.ConnectionId) ?? "?";

        var message = new ChatMessageDto
        {
            User = senderName,
            Text = trimmed,
            TimestampMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        await Clients.Group(roomId).SendAsync("ChatMessage", message);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (roomId, userName) = state.UnregisterConnection(Context.ConnectionId);
        if (roomId != null && userName != null)
        {
            await Clients.Group(roomId).SendAsync("UserLeft", userName);
        }

        await base.OnDisconnectedAsync(exception);
    }
}