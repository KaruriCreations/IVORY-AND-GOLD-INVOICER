export default function ClientDetails({
  header,
  updateHeader,
  eventDetails,
  updateEventDetails,
}) {
  const clientFields = [
    {
      id: 'clientName',
      label: 'Client Name',
      icon: 'business',
      type: 'text',
      placeholder: 'e.g. Yakuti Events Ltd',
      value: header.clientName,
      onChange: (val) => updateHeader('clientName', val),
    },
    {
      id: 'invoiceNum',
      label: 'Quotation / Invoice #',
      icon: 'tag',
      type: 'text',
      placeholder: 'e.g. QUO-2026-001',
      extraClass: 'font-mono',
      value: header.invoiceNum,
      onChange: (val) => updateHeader('invoiceNum', val),
    },
    {
      id: 'date',
      label: 'Document Date',
      icon: 'calendar_today',
      type: 'date',
      value: header.date,
      onChange: (val) => updateHeader('date', val),
    },
  ];

  const eventFields = [
    {
      id: 'noOfGuests',
      label: 'No. of Guests',
      icon: 'groups',
      type: 'text',
      placeholder: 'e.g. 400 Pax',
      value: eventDetails?.noOfGuests || '',
      onChange: (val) => updateEventDetails('noOfGuests', val),
    },
    {
      id: 'colors',
      label: 'Theme Colors',
      icon: 'palette',
      type: 'text',
      placeholder: 'e.g. Gold, Orange & Aqua blue',
      value: eventDetails?.colors || '',
      onChange: (val) => updateEventDetails('colors', val),
    },
    {
      id: 'dateOfFunction',
      label: 'Date of Function',
      icon: 'event_available',
      type: 'text',
      placeholder: 'e.g. 19th December, 2026',
      value: eventDetails?.dateOfFunction || '',
      onChange: (val) => updateEventDetails('dateOfFunction', val),
    },
    {
      id: 'eventType',
      label: 'Event Type',
      icon: 'celebration',
      type: 'text',
      placeholder: 'e.g. Garden Wedding',
      value: eventDetails?.eventType || '',
      onChange: (val) => updateEventDetails('eventType', val),
    },
    {
      id: 'venue',
      label: 'Venue',
      icon: 'location_on',
      type: 'text',
      placeholder: 'e.g. Karen, Nairobi',
      value: eventDetails?.venue || '',
      onChange: (val) => updateEventDetails('venue', val),
    },
    {
      id: 'attn',
      label: 'Attn / Contact Person',
      icon: 'badge',
      type: 'text',
      placeholder: 'e.g. Rosaline',
      value: eventDetails?.attn || '',
      onChange: (val) => updateEventDetails('attn', val),
    },
  ];

  return (
    <section className="bg-surface-container-lowest shadow-[0_4px_6px_-1px_rgba(26,43,60,0.05),0_2px_4px_-1px_rgba(26,43,60,0.03)] rounded-xl p-md md:p-lg transition-transform duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_24px_-4px_rgba(26,43,60,0.08)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md mb-lg pb-md border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-display-lg md:text-display-lg text-on-surface mb-xs">
            Quotation &amp; Invoice Generator
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Create professional event quotations with Ivory &amp; Gold Events master template.
          </p>
        </div>
        <div className="bg-primary-container text-on-primary-container px-sm sm:px-md py-xs sm:py-sm rounded-full flex items-center gap-xs sm:gap-sm shadow-sm">
          <span className="material-symbols-outlined text-[16px] sm:text-[20px]">
            verified
          </span>
          <span className="font-label-sm text-label-sm sm:font-label-md sm:text-label-md whitespace-nowrap">
            Ivory & Gold Master v3.0
          </span>
        </div>
      </div>

      {/* Main Document Details */}
      <div className="mb-lg">
        <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-sm flex items-center gap-xs">
          <span className="material-symbols-outlined text-[18px]">description</span>
          Document Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
          {clientFields.map((field) => (
            <div key={field.id} className="flex flex-col gap-xs">
              <label
                className="font-label-md text-label-md text-on-surface-variant"
                htmlFor={field.id}
              >
                {field.label}
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                  {field.icon}
                </span>
                <input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder || ''}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className={`w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                    field.extraClass || ''
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Grid */}
      <div className="pt-md border-t border-outline-variant/30">
        <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-sm flex items-center gap-xs">
          <span className="material-symbols-outlined text-[18px]">event</span>
          Event &amp; Function Specifics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
          {eventFields.map((field) => (
            <div key={field.id} className="flex flex-col gap-xs">
              <label
                className="font-label-md text-label-md text-on-surface-variant"
                htmlFor={field.id}
              >
                {field.label}
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                  {field.icon}
                </span>
                <input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder || ''}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
