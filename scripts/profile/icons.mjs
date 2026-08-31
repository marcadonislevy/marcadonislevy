export function renderIcon(type, x, y, colour, scale = 1) {
  const strokeWidth = 1.8 / scale;
  const stroke = `stroke="${colour}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const transform = `transform="translate(${x} ${y}) scale(${scale})"`;
  switch (type) {
    case "monitor":
      return `<g ${transform} ${stroke}><rect x="-12" y="-9" width="24" height="17" rx="2"/><path d="M-4 12h8M0 8v4M-7-4h14M-7 0h8"/></g>`;
    case "cloud":
      return `<g ${transform} ${stroke}><path d="M-12 5h23a7 7 0 0 0 0-14 10 10 0 0 0-19-2A7 7 0 0 0-12 5Z"/></g>`;
    case "puzzle":
      return `<g ${transform} ${stroke}><path d="M-12-10h8a4 4 0 1 0 8 0h8v8a4 4 0 1 1 0 8v8H4a4 4 0 1 0-8 0h-8V6a4 4 0 1 1 0-8Z"/></g>`;
    case "server":
      return `<g ${transform} ${stroke}><rect x="-12" y="-11" width="24" height="9" rx="2"/><rect x="-12" y="2" width="24" height="9" rx="2"/><circle cx="7" cy="-6.5" r="1" fill="${colour}"/><circle cx="7" cy="6.5" r="1" fill="${colour}"/><path d="M-8-6.5h7M-8 6.5h7"/></g>`;
    case "database":
      return `<g ${transform} ${stroke}><ellipse cx="0" cy="-8" rx="11" ry="5"/><path d="M-11-8v16c0 3 5 5 11 5s11-2 11-5V-8M-11 0c0 3 5 5 11 5s11-2 11-5"/></g>`;
    case "gear":
      return `<g ${transform} ${stroke}><circle r="7"/><circle r="2"/><path d="M0-13v4M0 9v4M-13 0h4M9 0h4M-9-9l3 3M6 6l3 3M9-9 6-6M-6 6-9 9"/></g>`;
    case "people":
      return `<g ${transform} ${stroke}><circle cx="-6" cy="-6" r="4"/><circle cx="6" cy="-6" r="4"/><path d="M-13 10c1-7 4-10 7-10s6 3 7 10M0 10c1-7 3-10 6-10s6 3 7 10"/></g>`;
    case "flask":
      return `<g ${transform} ${stroke}><path d="M-5-13h10M-2-13v9l-9 15h22L2-4v-9M-7 5h14"/></g>`;
    case "hosting":
      return `<g ${transform} ${stroke}><path d="M-12 4h24v10h-24zM-8 4V0a8 8 0 0 1 16 0v4M-6 9h5M6 9h1"/></g>`;
    case "app":
      return `<g ${transform} ${stroke}><rect x="-11" y="-13" width="22" height="26" rx="2"/><path d="M-7-7h14M-7-2h8M-6 8h12"/></g>`;
    case "construction":
      return `<g ${transform} ${stroke}><path d="M-13 11h26M-7 11V-10h14v21M-12-10h24M-7-5h14M0-10v-6M0-16h10M10-16v5"/></g>`;
    case "leaf":
      return `<g ${transform} ${stroke}><path d="M-2 13C-1 2 3-6 13-12c1 12-4 22-15 25ZM-2 13C-5 4-10 0-15-1c0 8 5 13 13 14Z"/></g>`;
    case "shield":
      return `<g ${transform} ${stroke}><path d="M0-14 12-9v8c0 8-5 13-12 17C-7 12-12 7-12-1v-8Z"/></g>`;
    case "community":
      return `<g ${transform} ${stroke}><circle cx="-7" cy="-6" r="4"/><circle cx="7" cy="-6" r="4"/><circle cy="-10" r="4"/><path d="M-14 11c1-7 4-10 7-10 2 0 4 1 5 3M14 11c-1-7-4-10-7-10-2 0-4 1-5 3M-7 11c1-7 3-10 7-10s6 3 7 10"/></g>`;
    case "brain":
    default:
      return `<g ${transform} ${stroke}><path d="M-2-12c-5-3-10 1-9 6-5 2-5 9 0 11-1 5 5 9 9 6V-12ZM2-12c5-3 10 1 9 6 5 2 5 9 0 11 1 5-5 9-9 6V-12ZM-7-3h5M2-5h5M-6 5h4M2 3h5"/></g>`;
  }
}
