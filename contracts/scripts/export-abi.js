// Copies the compiled ABIs into the web app.
const fs = require("fs");
const path = require("path");

function exportAbi() {
  const out = path.join(__dirname, "..", "..", "web", "src", "abi");
  fs.mkdirSync(out, { recursive: true });
  for (const [name, dir] of [["IndexVault", "IndexVault.sol"], ["MockPriceFeed", "mocks/MockPriceFeed.sol"]]) {
    const artifact = require(path.join(__dirname, "..", "artifacts", "contracts", dir, `${name}.json`));
    const src = `export const ${name[0].toLowerCase() + name.slice(1)}Abi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
    fs.writeFileSync(path.join(out, `${name}.ts`), src);
  }
  console.log(`ABIs exported to ${path.relative(process.cwd(), out)}`);
}

module.exports = { exportAbi };
if (require.main === module) exportAbi();
