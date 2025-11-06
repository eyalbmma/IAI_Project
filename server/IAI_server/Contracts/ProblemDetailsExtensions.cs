using Microsoft.AspNetCore.Mvc;

namespace IAI_server.Contracts;

public static class ProblemDetailsExtensions
{
    public static ProblemDetails WithTraceId(this ProblemDetails pd, string traceId)
    {
        if (!pd.Extensions.ContainsKey("traceId"))
            pd.Extensions["traceId"] = traceId;
        return pd;
    }
}
