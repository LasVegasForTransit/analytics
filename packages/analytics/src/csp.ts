const SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';

function parse(header: string) {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/\s+/));
}

function add(directives: string[][], name: string, values: readonly string[]) {
  let directive = directives.find(([candidate]) => candidate === name);
  if (!directive) {
    const fallback = directives.find(([candidate]) => candidate === 'default-src');
    if (!fallback) return;
    directive = [name, ...fallback.slice(1)];
    directives.push(directive);
  }
  for (const value of values) if (!directive.includes(value)) directive.push(value);
}

function merge(header: string, collector = 'https://events.lasvegasfortransit.org') {
  const directives = parse(header);
  add(directives, 'script-src', [SCRIPT_ORIGIN]);
  add(directives, 'connect-src', ['https://cloudflareinsights.com', collector]);
  return directives.map((directive) => directive.join(' ')).join('; ');
}

function check(header: string, collector = 'https://events.lasvegasfortransit.org') {
  const directives = parse(header);
  const fallback = directives.find(([name]) => name === 'default-src');
  const required = [
    ['script-src', SCRIPT_ORIGIN],
    ['connect-src', 'https://cloudflareinsights.com'],
    ['connect-src', collector],
  ] as const;
  return required
    .filter(([name, value]) => {
      const effective = directives.find(([candidate]) => candidate === name) ?? fallback;
      return effective ? !effective.includes(value) : false;
    })
    .map(([name, value]) => `${name} is missing ${value}`);
}

export const csp = {
  directives(collector = 'https://events.lasvegasfortransit.org') {
    return {
      'script-src': [SCRIPT_ORIGIN],
      'connect-src': ['https://cloudflareinsights.com', collector],
    };
  },
  merge,
  check,
};
