using System.Collections.Concurrent;

namespace Task6;

public class CircuitStateService
{
    private readonly ConcurrentDictionary<string, RoomModel> _rooms = new();
    
    private readonly ConcurrentDictionary<string, (string RoomId, string UserId)> _connections = new();

    public RoomModel CreateRoom(string name, bool isPrivate, string? password)
    {
        var roomId = Guid.NewGuid().ToString("N")[..6];
        var room = new RoomModel
        {
            Id = roomId,
            Name = string.IsNullOrWhiteSpace(name) ? $"Комната {roomId}" : name,
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