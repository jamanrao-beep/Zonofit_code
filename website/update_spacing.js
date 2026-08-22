const fs = require('fs');
const file = 'c:/Users/amanr/OneDrive/Desktop/Projects/Zonofit_code/website/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Standardize section paddings to py-24 md:py-32
content = content.replace(/py-\d+ md:py-\d+/g, 'py-24 md:py-32');

// Standardize max-w container
// We replace max-w-4xl, max-w-5xl, max-w-6xl with max-w-5xl
content = content.replace(/className="max-w-[456]xl mx-auto/g, 'className="max-w-5xl mx-auto');

// Add reveal classes
// 1. To all h2 elements that don't already have it
content = content.replace(/<h2 className="(.*?)">/g, (match, p1) => {
    if (!p1.includes('reveal')) return `<h2 className="${p1} reveal">`;
    return match;
});

// 2. To grids inside sections, add reveal to their children
const cardClasses = [
    'bg-white rounded-3xl p-6',
    'bg-white rounded-2xl p-6',
    'bg-white rounded-\\[24px\\] p-8',
    'bg-\\[#f1f1f1\\] rounded-3xl',
    'bg-white\\/5 border'
];

for (const c of cardClasses) {
    const regex = new RegExp(`className="${c}(.*?)"`, 'g');
    content = content.replace(regex, (match, p1) => {
        if (!p1.includes('reveal')) return `className="${c.replace(/\\/g, '')}${p1} reveal"`;
        return match;
    });
}

// Write it back
fs.writeFileSync(file, content);
console.log('Updated page.tsx');
