const fs = require('fs');
const path = require('path');

const projectDir = 'd:\\nha-xe-abc\\mobile';

const hasVietnamese = (text) => {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(text);
};

const ignoredDirs = ['node_modules', '.expo', '.git', 'assets', 'build'];
const ignoredFiles = ['translations.ts', 'generate-translations.js'];

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
  let hasLines = false;
  lines.forEach((line, index) => {
    // Ignore comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    
    if (hasVietnamese(line)) {
      if (!hasLines) {
        console.log(`\n📄 File: ${filePath.replace(projectDir, '')}`);
        hasLines = true;
      }
      console.log(`  Line ${index + 1}: ${trimmed}`);
    }
  });
}

walk(projectDir);
