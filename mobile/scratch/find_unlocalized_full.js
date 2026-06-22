const fs = require('fs');
const path = require('path');

const projectDir = 'd:\\nha-xe-abc\\mobile';
const outputFile = 'd:\\nha-xe-abc\\mobile\\scratch\\unlocalized_report.txt';

const hasVietnamese = (text) => {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(text);
};

const ignoredDirs = ['node_modules', '.expo', '.git', 'assets', 'build', 'scratch'];
const ignoredFiles = ['translations.ts', 'generate-translations.js'];

let report = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!ignoredDirs.includes(file)) {
        walk(fullPath);
      }
    } else {
      if (!ignoredFiles.includes(file) && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileLines = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    
    if (hasVietnamese(line)) {
      fileLines.push(`  Line ${index + 1}: ${trimmed}`);
    }
  });

  if (fileLines.length > 0) {
    report.push(`📄 File: ${filePath.replace(projectDir, '')}`);
    report.push(...fileLines);
    report.push('');
  }
}

walk(projectDir);
fs.writeFileSync(outputFile, report.join('\n'), 'utf8');
console.log('Report generated at ' + outputFile);
