import { webkit, firefox } from "playwright";
const home = process.env.HOME + "/Library/Caches/ms-playwright";
for (const [name, type, path] of [["webkit", webkit, `${home}/webkit-2336/pw_run.sh`], ["firefox", firefox, `${home}/firefox-1538/firefox/Nightly.app/Contents/MacOS/firefox`]]) {
  try { const b = await type.launch({ executablePath: path }); const p = await b.newPage(); await p.goto("http://localhost:4173/"); console.log(name, "OK", b.version(), await p.title()); await b.close(); } catch (e) { console.log(name, "FALLÓ", String(e).split("\n")[0].slice(0, 200)); }
}
