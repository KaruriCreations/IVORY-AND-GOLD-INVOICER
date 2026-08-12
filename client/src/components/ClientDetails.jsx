import React from 'react';
import InteractiveGlowCard from './ui/InteractiveGlowCard';
import SpotlightText from './ui/SpotlightText';
import DatePicker from './ui/DatePicker';
import LuxuryCombobox from './ui/LuxuryCombobox';

export default function ClientDetails({
  header,
  updateHeader,
  eventDetails,
  updateEventDetails,
}) {
  const eventTypeOptions = [
    { label: 'Garden Wedding', desc: 'Outdoor & marquee weddings' },
    { label: 'Corporate Gala', desc: 'Awards, AGMs & conferences' },
    { label: 'Traditional Engagement / Ruracio', desc: 'Cultural ceremonies' },
    { label: 'Private Luxury Dinner', desc: 'Exclusive VIP dining' },
    { label: 'Cocktail Reception', desc: 'Networking & party lounges' },
    { label: 'Birthday Celebration', desc: 'Milestone birthday parties' },
    { label: 'Brand Launch & Product Reveal', desc: 'Corporate PR activations' },
    { label: 'Charity Ball & Fundraiser', desc: 'Formal charity banquets' },
    { label: 'Anniversary Soirée', desc: 'Romantic & family milestones' },
  ];

  const themeColorOptions = [
    {
      label: 'Gold, Emerald & Ivory',
      colors: ['#D4AF37', '#006C49', '#FFFFF0'],
      desc: 'Signature luxury palette',
    },
    {
      label: 'Royal Navy & Champagne Gold',
      colors: ['#041627', '#E5CE82', '#FFFFFF'],
      desc: 'Classic formal elegance',
    },
    {
      label: 'Blush Pink, Cream & Rose Gold',
      colors: ['#FFB6C1', '#FFFDD0', '#B76E79'],
      desc: 'Romantic wedding theme',
    },
    {
      label: 'Classic Black, White & Gold',
      colors: ['#111111', '#FFFFFF', '#D4AF37'],
      desc: 'High-contrast modern chic',
    },
    {
      label: 'Burgundy, Plum & Dusty Rose',
      colors: ['#800020', '#4E1E34', '#DCAE96'],
      desc: 'Deep winter warmth',
    },
    {
      label: 'Terracotta, Sage & Burnt Orange',
      colors: ['#E2725B', '#9CAF88', '#CC5500'],
      desc: 'Boho & rustic garden',
    },
    {
      label: 'Pastel Lilac & Soft Gold',
      colors: ['#C8A2C8', '#FFF8DC', '#D4AF37'],
      desc: 'Dreamy spring celebration',
    },
  ];

  return (
    <InteractiveGlowCard
      enableTilt={false}
      glowColor="rgba(212, 175, 55, 0.25)"
      className="bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(26,43,60,0.06)] p-md md:p-lg"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md mb-lg pb-md border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-display-lg md:text-display-lg text-on-surface mb-xs">
            <SpotlightText
              text="Quotation & Invoice Generator"
              spotlightColor="rgba(212, 175, 55, 0.9)"
              baseClassName="text-on-surface"
            />
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Create professional event quotations with Ivory &amp; Gold Events master template.
          </p>
        </div>
        <div className="bg-primary-container text-white px-sm sm:px-md py-xs sm:py-sm rounded-full flex items-center gap-xs sm:gap-sm shadow-md border border-white/10">
          <span className="material-symbols-outlined text-[16px] sm:text-[20px] text-[#ffd700]">
            verified
          </span>
          <span className="font-label-sm text-label-sm sm:font-label-md sm:text-label-md whitespace-nowrap">
            I&amp;G EVENTS
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
          {/* Client Name */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="clientName">
              Client Name
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                business
              </span>
              <input
                id="clientName"
                type="text"
                placeholder="e.g. Yakuti Events Ltd"
                value={header.clientName}
                onChange={(e) => updateHeader('clientName', e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Quotation / Invoice # */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="invoiceNum">
              Quotation / Invoice #
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                tag
              </span>
              <input
                id="invoiceNum"
                type="text"
                placeholder="e.g. QUO-2026-001"
                value={header.invoiceNum}
                onChange={(e) => updateHeader('invoiceNum', e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Document Date - Sleek Popover DatePicker */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="documentDate">
              Document Date
            </label>
            <DatePicker
              id="documentDate"
              value={header.date}
              onChange={(val) => updateHeader('date', val)}
              placeholder="Select document date..."
            />
          </div>
        </div>
      </div>

      {/* Event Details Grid */}
      <div className="pt-md border-t border-outline-variant/30">
        <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-sm flex items-center gap-xs">
          <span className="material-symbols-outlined text-[18px]">event</span>
          Event &amp; Function Specifics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
          {/* No. of Guests */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="noOfGuests">
              No. of Guests
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                groups
              </span>
              <input
                id="noOfGuests"
                type="text"
                placeholder="e.g. 400 Pax"
                value={eventDetails?.noOfGuests || ''}
                onChange={(e) => updateEventDetails('noOfGuests', e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Theme Colors - Luxury Combobox */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="themeColors">
              Theme Colors
            </label>
            <LuxuryCombobox
              id="themeColors"
              value={eventDetails?.colors || ''}
              onChange={(val) => updateEventDetails('colors', val)}
              options={themeColorOptions}
              placeholder="Select or type theme colors..."
              icon="palette"
            />
          </div>

          {/* Date of Function - Popover DatePicker */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="dateOfFunction">
              Date of Function
            </label>
            <DatePicker
              id="dateOfFunction"
              value={eventDetails?.dateOfFunction || ''}
              onChange={(val) => updateEventDetails('dateOfFunction', val)}
              placeholder="Select event date..."
              icon="event_available"
            />
          </div>

          {/* Event Type - Luxury Combobox */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="eventType">
              Event Type
            </label>
            <LuxuryCombobox
              id="eventType"
              value={eventDetails?.eventType || ''}
              onChange={(val) => updateEventDetails('eventType', val)}
              options={eventTypeOptions}
              placeholder="Select or type event type..."
              icon="celebration"
            />
          </div>

          {/* Venue */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="venue">
              Venue
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                location_on
              </span>
              <input
                id="venue"
                type="text"
                placeholder="e.g. Karen, Nairobi"
                value={eventDetails?.venue || ''}
                onChange={(e) => updateEventDetails('venue', e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Attn / Contact */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="attn">
              Attn / Contact Person
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                badge
              </span>
              <input
                id="attn"
                type="text"
                placeholder="e.g. Rosaline"
                value={eventDetails?.attn || ''}
                onChange={(e) => updateEventDetails('attn', e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg py-sm pl-xl pr-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </InteractiveGlowCard>
  );
}
