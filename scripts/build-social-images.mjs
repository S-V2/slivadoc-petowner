import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const logo = (await readFile(new URL("brand/slivadoc-logo.png", publicDir))).toString("base64");
const output = new URL("social/", publicDir);
await mkdir(output, { recursive: true });

function socialCard(career) {
  const title = career
    ? `<text x="72" y="285" font-size="66" font-weight="800">Tumbuh bersama</text>
       <text x="72" y="370" font-size="82" font-weight="800">Slivadoc.</text>`
    : `<text x="72" y="285" font-size="76" font-weight="800">One Platform.</text>
       <text x="72" y="375" font-size="76" font-weight="800">Every Animal.</text>`;
  const subtitle = career
    ? "Temukan peran. Buat perubahan."
    : "Kesehatan, layanan, dan kebutuhan pet.";
  const pills = career
    ? [["Full-time", 72, 145], ["Part-time", 231, 148], ["Freelance", 393, 155]]
    : [["Konsultasi", 72, 154], ["Booking", 240, 137], ["Pet Care", 391, 143]];
  const art = career
    ? `<circle cx="958" cy="337" r="201" fill="#e0f3ff"/>
       <circle cx="958" cy="337" r="158" fill="none" stroke="#ffffff" stroke-width="2"/>
       ${[["Pet Care", 218], ["Teknologi", 320], ["Operasional", 422]].map(([label, y], index) => `
         <g transform="translate(${index === 1 ? 810 : 776} ${y})">
           <rect x="0" y="6" width="337" height="78" rx="22" fill="#c1e4f4" opacity=".35"/>
           <rect width="337" height="78" rx="22" fill="#ffffff" stroke="#d4e9f3"/>
           <rect x="18" y="16" width="46" height="46" rx="14" fill="#e9f7ff"/>
           <path d="M32 39l7 7 12-14" fill="none" stroke="#078fca" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
           <text x="82" y="47" font-size="23" font-weight="700">${label}</text>
           <circle cx="302" cy="39" r="4" fill="#40b7d9"/>
         </g>`).join("")}`
    : `<circle cx="970" cy="340" r="213" fill="#e0f3ff"/>
       <circle cx="970" cy="340" r="174" fill="none" stroke="#ffffff" stroke-width="2"/>
       <circle cx="970" cy="340" r="132" fill="#ffffff"/>
       <image x="860" y="230" width="220" height="220" href="data:image/png;base64,${logo}"/>
       <circle cx="1120" cy="206" r="16" fill="#91ddf3"/>
       <circle cx="791" cy="468" r="11" fill="#a7cce9"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#eef9ff"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <path d="M0 0h1200v14H0z" fill="#21a9df"/>
    <g font-family="Arial, Helvetica, sans-serif" fill="#153b5b">
      <image x="72" y="64" width="76" height="76" href="data:image/png;base64,${logo}"/>
      <text x="164" y="119" font-size="48" font-weight="800" letter-spacing="-2">sliva<tspan fill="#09a1dc">doc</tspan></text>
      ${career ? `<rect x="397" y="83" width="128" height="37" rx="18" fill="#e4f5ff"/>
       <text x="461" y="108" text-anchor="middle" font-size="18" font-weight="700" fill="#087fb3">Career</text>` : ""}
      ${title}
      <text x="75" y="431" font-size="25" fill="#55718a">${subtitle}</text>
      ${pills.map(([label, x, width]) => `<rect x="${x}" y="469" width="${width}" height="44" rx="22" fill="#e9f6ff" stroke="#cce8f4"/>
        <text x="${x + width / 2}" y="497" text-anchor="middle" font-size="18" font-weight="700" fill="#237698">${label}</text>`).join("")}
      ${art}
      <path d="M72 558H1128" stroke="#d6e9f2"/>
      <text x="72" y="598" font-size="20" font-weight="700" fill="#316b89">slivadoc.com${career ? "/career" : ""}</text>
      <text x="1128" y="598" text-anchor="end" font-size="17" fill="#607f94">${career ? "Grow with Slivadoc" : "Pet Care Ecosystem"}</text>
    </g>
  </svg>`;
}

for (const career of [false, true]) {
  const name = `slivadoc${career ? "-career" : ""}-20261020.jpg`;
  const destination = fileURLToPath(new URL(name, output));
  await sharp(Buffer.from(socialCard(career)))
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .jpeg({ quality: 88, mozjpeg: true, progressive: false, chromaSubsampling: "4:4:4" })
    .toFile(destination);
  const decoded = await sharp(destination, { failOn: "error" }).raw().toBuffer({ resolveWithObject: true });
  if (decoded.info.width !== 1200 || decoded.info.height !== 630 || decoded.info.channels !== 3)
    throw new Error(`Invalid social image: ${name}`);
  console.log(`Generated ${name}: ${decoded.info.width} × ${decoded.info.height}, opaque JPEG`);
}
