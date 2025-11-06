using IAI_server.Contracts;
using IAI_server.Services;
using Microsoft.AspNetCore.Mvc;

namespace IAI_server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdsController : ControllerBase
{
    private readonly IAdsService _service;
    private readonly ILogger<AdsController> _logger;

    public AdsController(IAdsService service, ILogger<AdsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AdDto>>> Get([FromQuery] AdsQueryParams query)
    {
        var result = await _service.GetListAsync(query);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdDto>> GetById(Guid id)
    {
        var ad = await _service.GetByIdAsync(id);
        if (ad is null) return NotFound();
        return Ok(ad);
    }

    [HttpPost]
    public async Task<ActionResult<AdDto>> Create([FromBody] CreateAdRequest request)
    {
        var created = await _service.CreateAsync(request);
        _logger.LogInformation("Ad created {AdId}", created.Id);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAdRequest request)
    {
        var updated = await _service.UpdateAsync(id, request);
        if (updated is null) return NotFound();
        _logger.LogInformation("Ad updated {AdId}", id);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);
        if (!success) return NotFound();
        _logger.LogInformation("Ad deleted {AdId}", id);
        return NoContent();
    }

    [HttpGet("/api/health")]
    public IActionResult Health() => Ok(new { status = "ok" });
}
