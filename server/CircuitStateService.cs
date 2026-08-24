using System.Collections.Concurrent;

namespace Task6.server;

public class CircuitStateService
{
    private readonly ConcurrentDictionary<string, RoomModel> _rooms = new();

    private readonly ConcurrentDictionary<string, (string RoomId, string UserId)> _connections = new();

    private int _anonymousRoomCounter;

    public RoomModel CreateRoom(string name, bool isPrivate, string? password)
    {
        var roomId = Guid.NewGuid().ToString("N")[..6];
        var displayName = name;
        if (string.IsNullOrWhiteSpace(displayName))
        {
            var n = Interlocked.Increment(ref _anonymousRoomCounter);
            displayName = $"Комната №{n}";
        }

        var room = new RoomModel
        {
            Id = roomId,
            Name = displayName,
            IsPrivate = isPrivate,
            Password = string.IsNullOrWhiteSpace(password) ? null : password
        };
        _rooms[roomId] = room;
        return room;
    }

    public List<RoomDto> GetPublicRooms()
    {
        return _rooms.Values
            .Where(r => !r.IsPrivate)
            .Select(r => new RoomDto
            {
                Id = r.Id,
                Name = r.Name,
                UsersCount = r.Users.Count,
                HasPassword = !string.IsNullOrEmpty(r.Password),
                IsPrivate = r.IsPrivate
            })
            .ToList();
    }

    public RoomModel? GetRoom(string roomId) => _rooms.GetValueOrDefault(roomId);

    public string RegisterUser(string connectionId, string roomId, string userId, string requestedName)
    {
        var room = GetRoom(roomId);
        if (room == null) return requestedName;

        _connections[connectionId] = (roomId, userId);

        lock (room.Users)
        {
            if (room.Users.TryGetValue(userId, out var userData))
            {
                userData.ConnectionIds.Add(connectionId);
                return userData.AssignedName;
            }

            var baseName = string.IsNullOrWhiteSpace(requestedName) ? "User" : requestedName.Trim();
            var finalName = baseName;
            var count = 2;

            var currentNames = room.Users.Values.Select(u => u.AssignedName).ToHashSet();
            while (currentNames.Contains(finalName))
            {
                finalName = $"{baseName} {count++}";
            }

            var newUserData = new UserConnectionData { AssignedName = finalName };
            newUserData.ConnectionIds.Add(connectionId);
            room.Users[userId] = newUserData;

            return finalName;
        }
    }

    public List<string> GetRoomUserNames(string roomId)
    {
        var room = GetRoom(roomId);
        if (room == null) return new List<string>();

        lock (room.Users)
        {
            return room.Users.Values.Select(u => u.AssignedName).ToList();
        }
    }

    public string? GetAssignedNameForConnection(string connectionId)
    {
        if (!_connections.TryGetValue(connectionId, out var info)) return null;
        if (!_rooms.TryGetValue(info.RoomId, out var room)) return null;

        lock (room.Users)
        {
            foreach (var user in room.Users.Values)
            {
                if (user.ConnectionIds.Contains(connectionId)) return user.AssignedName;
            }
        }
        return null;
    }

    public (string? roomId, string? userName) UnregisterConnection(string connectionId)
    {
        if (!_connections.TryRemove(connectionId, out var info))
        {
            return (null, null);
        }

        if (_rooms.TryGetValue(info.RoomId, out var room))
        {
            lock (room.Users)
            {
                if (room.Users.TryGetValue(info.UserId, out var userData))
                {
                    userData.ConnectionIds.Remove(connectionId);

                    if (userData.ConnectionIds.Count == 0)
                    {
                        room.Users.Remove(info.UserId);

                        if (room.Users.Count == 0)
                        {
                            _rooms.TryRemove(info.RoomId, out _);
                        }

                        return (info.RoomId, userData.AssignedName);
                    }
                }
            }
        }

        return (null, null);
    }

    public void SaveCircuit(string roomId, string json)
    {
        if (_rooms.TryGetValue(roomId, out var room))
        {
            room.CircuitJson = json;
        }
    }
}
