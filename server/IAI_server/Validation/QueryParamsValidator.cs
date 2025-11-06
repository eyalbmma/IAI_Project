using FluentValidation;
using IAI_server.Contracts;

namespace IAI_server.Validation;

public class QueryParamsValidator : AbstractValidator<AdsQueryParams>
{
    public QueryParamsValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);

        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).When(x => x.MinPrice.HasValue);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0).When(x => x.MaxPrice.HasValue);
        RuleFor(x => x).Must(x => !x.MinPrice.HasValue || !x.MaxPrice.HasValue || x.MinPrice <= x.MaxPrice)
            .WithMessage("MinPrice must be less than or equal to MaxPrice.");

        RuleFor(x => x.SortDir)
            .Must(d => string.IsNullOrEmpty(d) ||
                       d.Equals("asc", StringComparison.OrdinalIgnoreCase) ||
                       d.Equals("desc", StringComparison.OrdinalIgnoreCase))
            .WithMessage("SortDir must be 'asc' or 'desc'.");

        // Location params validation
        When(x => x.UserLat.HasValue || x.UserLng.HasValue || x.Radius.HasValue, () =>
        {
            RuleFor(x => x.UserLat)
                .NotNull().WithMessage("userLat and userLng must both be provided for location filtering.")
                .InclusiveBetween(-90.0, 90.0);

            RuleFor(x => x.UserLng)
                .NotNull().WithMessage("userLat and userLng must both be provided for location filtering.")
                .InclusiveBetween(-180.0, 180.0);

            RuleFor(x => x.Radius)
                .GreaterThan(0).When(x => x.Radius.HasValue)
                .WithMessage("Radius must be greater than 0.");
        });
    }
}
