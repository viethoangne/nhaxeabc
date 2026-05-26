const { execSync } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables từ .env
dotenv.config({ path: path.join(__dirname, '.env') });

const source = process.env.DATABASE_URL_PRODUCTION;
const target = process.env.DATABASE_URL;

if (!source) {
  console.error('❌ Lỗi: Không tìm thấy DATABASE_URL_PRODUCTION trong file .env');
  process.exit(1);
}

if (!target) {
  console.error('❌ Lỗi: Không tìm thấy DATABASE_URL trong file .env');
  process.exit(1);
}

// Kiểm tra an toàn: Đảm bảo đích đến (target) là localhost/127.0.0.1
if (!target.includes('localhost') && !target.includes('127.0.0.1')) {
  console.error('❌ CẢNH BÁO AN TOÀN: DATABASE_URL không phải là localhost! Không thể chạy script này để tránh ghi đè dữ liệu Production.');
  process.exit(1);
}

// Helper tìm pg_dump và psql trong Windows / Unix
function getPgToolPath(toolName) {
  try {
    execSync(`${toolName} --version`, { stdio: 'ignore' });
    return toolName; // Đã có sẵn trong PATH
  } catch (e) {
    if (process.platform === 'win32') {
      const possibleDirs = [
        'D:\\sql\\bin',
        'C:\\Program Files\\PostgreSQL',
        'C:\\laragon\\bin\\postgresql'
      ];
      
      for (const baseDir of possibleDirs) {
        if (fs.existsSync(baseDir)) {
          if (baseDir.endsWith('bin')) {
            const exePath = path.join(baseDir, `${toolName}.exe`);
            if (fs.existsSync(exePath)) {
              return `"${exePath}"`;
            }
          } else {
            const versions = fs.readdirSync(baseDir);
            versions.sort((a, b) => parseFloat(b) - parseFloat(a));
            for (const ver of versions) {
              const exePath = path.join(baseDir, ver, 'bin', `${toolName}.exe`);
              if (fs.existsSync(exePath)) {
                return `"${exePath}"`;
              }
            }
          }
        }
      }
    }
    return null;
  }
}

const pgDumpCmd = getPgToolPath('pg_dump');
const psqlCmd = getPgToolPath('psql');

if (!pgDumpCmd || !psqlCmd) {
  console.error('❌ Lỗi: Không tìm thấy pg_dump hoặc psql trong hệ thống.');
  console.error('💡 Vui lòng đảm bảo bạn đã cài đặt PostgreSQL và thêm thư mục bin vào Biến môi trường (Environment Variables).');
  if (process.platform === 'win32') {
    console.error('Đường dẫn mặc định kiểm tra: C:\\Program Files\\PostgreSQL\\<version>\\bin');
  }
  process.exit(1);
}

console.log('🔄 Bắt đầu đồng bộ dữ liệu từ Railway Production về Local...');
console.log(`Source (Railway): ${source.split('@')[1] || source}`);
console.log(`Target (Local):   ${target.split('@')[1] || target}`);

const tempFile = path.join(__dirname, 'railway_backup.sql');

// Clean connection strings for native CLI tools (removes ?schema=public, etc.)
const cleanSource = source.split('?')[0];
const cleanTarget = target.split('?')[0];

try {
  // Bước 1: pg_dump từ Production về file sql tạm
  console.log('📥 Đang tải cấu trúc và dữ liệu từ Railway...');
  execSync(`${pgDumpCmd} -d "${cleanSource}" --clean --no-owner --no-privileges -f "${tempFile}"`, { stdio: 'inherit' });
  console.log('✅ Đã tải dữ liệu thành công!');

  // Bước 2: psql nạp vào Local
  console.log('📤 Đang nhập dữ liệu vào Database Local...');
  execSync(`${psqlCmd} -d "${cleanTarget}" -f "${tempFile}"`, { stdio: 'inherit' });
  console.log('✅ Đã đồng bộ thành công dữ liệu vào localhost!');

} catch (error) {
  console.error('❌ Có lỗi xảy ra trong quá trình đồng bộ:', error.message);
} finally {
  // Xóa file tạm sau khi đồng bộ
  try {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log('🧹 Đã dọn dẹp file tạm.');
    }
  } catch (e) {}
}
