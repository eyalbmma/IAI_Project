using FluentValidation;
using IAI_server.Contracts;

namespace IAI_server.Validation;

public class UpdateAdValidator : AbstractValidator<UpdateAdRequest>
{
    public UpdateAdValidator()
    {
        When(x => x.Title != null, () => RuleFor(x => x.Title!).NotEmpty().Length(1, 80));
        When(x => x.Description != null, () => RuleFor(x => x.Description!).NotEmpty().Length(1, 2000));
        When(x => x.Price.HasValue, () => RuleFor(x => x.Price!).GreaterThanOrEqualTo(0));

        When(x => x.Contact != null, () =>
        {
            RuleFor(x => x.Contact!.Name).NotEmpty();
            RuleFor(x => x.Contact!).Must(c => !string.IsNullOrEmpty(c.Email) || !string.IsNullOrEmpty(c.Phone))
                .WithMessage("Contact must contain at least an email or phone.");
            RuleFor(x => x.Contact!.Email).EmailAddress().When(c => !string.IsNullOrEmpty(c.Contact!.Email));
        });

        When(x => x.Location != null, () =>
        {
            RuleFor(x => x.Location!.Lat).InclusiveBetween(-90, 90).When(l => l.Location!.Lat.HasValue);
            RuleFor(x => x.Location!.Lng).InclusiveBetween(-180, 180).When(l => l.Location!.Lng.HasValue);
        });
    }
}
