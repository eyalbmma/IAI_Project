using System.Text.Json;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using FluentValidation;
using FluentValidation.AspNetCore;
using IAI_server.Middleware;
using IAI_server.Persistence;
using IAI_server.Services;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// configuration
builder.Configuration.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);

// MVC + ProblemDetails for model state validation
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Option 1: do not escape non-ASCII characters at all (renders Hebrew as-is)
        options.JsonSerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;

        // Or Option 2: allow broad Unicode ranges (including Hebrew)
        // options.JsonSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var pd = new ValidationProblemDetails(context.ModelState)
            {
                Title = "One or more validation errors occurred.",
                Status = StatusCodes.Status400BadRequest,
                Instance = context.HttpContext.Request.Path
            };
            pd.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            return new BadRequestObjectResult(pd)
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// register HttpClient factory required by GeocodingController
builder.Services.AddHttpClient();

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// CORS for Angular dev server
const string AngularPolicy = "AllowAngularDev";
builder.Services.AddCors(o => o.AddPolicy(AngularPolicy, p =>
{
    p.WithOrigins("http://localhost:4200")
     .AllowAnyHeader()
     .AllowAnyMethod();
}));

// DI
builder.Services.AddSingleton<IFileLock, FileLock>();
builder.Services.AddSingleton<IAdsRepository, FileAdsRepository>();
builder.Services.AddScoped<IAdsService, AdsService>();

// add this (once) during service registration
builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors(AngularPolicy);

// Global error handling
app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Ensure data file exists
try
{
    var adsPath = builder.Configuration.GetValue<string>("Data:AdsFilePath") ?? "Data/ads.json";
    var dir = Path.GetDirectoryName(adsPath);
    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        Directory.CreateDirectory(dir);
    if (!File.Exists(adsPath))
        File.WriteAllText(adsPath, "[]");
}
catch
{
    // ignore startup create errors; repository handles runtime cases
}

app.Run();
