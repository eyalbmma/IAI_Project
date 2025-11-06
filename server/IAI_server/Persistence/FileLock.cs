using System.Collections.Concurrent;

namespace IAI_server.Persistence;



public class FileLock : IFileLock
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public Task WaitAsync(string path)
    {
        var sem = _locks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));
        return sem.WaitAsync();
    }

    public void Release(string path)
    {
        if (_locks.TryGetValue(path, out var sem))
        {
            try { sem.Release(); } catch { /* ignore */ }
        }
    }
}
