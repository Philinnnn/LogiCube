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
            throw new HubException("Комната не найдена");
        }

        if (!string.IsNullOrEmpty(room.Password) && room.Password != password)
        {
            throw new HubException("Неверный пароль комнаты");
        }

        var assignedName = state.RegisterUser(Context.ConnectionId, roomId, userId, userName);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        await Clients.OthersInGroup(roomId).SendAsync("UserJoined", assignedName);

        return new JoinRoomResponseDto
        {
            AssignedName = assignedName,
            RoomName = room.Name,
            CurrentCircuit = room.CircuitJson
        };
    }

    public async Task SyncCircuit(string roomId, object circuitData)
    {
        var json = JsonSerializer.Serialize(circuitData);
        state.SaveCircuit(roomId, json);
        await Clients.OthersInGroup(roomId).SendAsync("CircuitUpdated", circuitData);
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