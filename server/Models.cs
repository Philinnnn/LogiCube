namespace Task6;

public class RoomModel
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsPrivate { get; set; }
    public string? Password { get; set; }
    public string CircuitJson { get; set; } = "{}";
    public bool IsRunning { get; set; }

    public Dictionary<string, UserConnectionData> Users { get; } = new();
}

public class UserConnectionData
{
    public string AssignedName { get; set; } = string.Empty;
    public HashSet<string> ConnectionIds { get; } = new();
}

public class RoomDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int UsersCount { get; set; }
    public bool HasPassword { get; set; }
    public bool IsPrivate { get; set; }
}

public class JoinRoomResponseDto
{
    public string AssignedName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string CurrentCircuit { get; set; } = "{}";
    public List<string> Users { get; set; } = new();
    public bool IsRunning { get; set; }
}

public class CreateRoomResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsPrivate { get; set; }
}

public class ChatMessageDto
{
    public string User { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public long TimestampMs { get; set; }
}