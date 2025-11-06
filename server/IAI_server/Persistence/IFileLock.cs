namespace IAI_server.Persistence
{
    // Minimal marker interface to match DI registration.
    // Add members as needed by your repository/service code.
    public interface IFileLock
    {
        Task WaitAsync(string path);
        void Release(string path);
    }
}
