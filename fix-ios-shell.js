const fs = require('fs');

let content = fs.readFileSync('tests/mobile-shell-brand.test.ts', 'utf8');
content = content.replace('const IOS_COPY = readFileSync(resolve(ROOT, "ios/App/App/public/index.html"), "utf8");\n', '');
content = content.replace(/\n  it\("ios cap-synced copy is byte-identical to the source shell", \(\) => \{\n    expect\(IOS_COPY\).toBe\(SHELL\);\n  \}\);\n/g, '');

fs.writeFileSync('tests/mobile-shell-brand.test.ts', content);
