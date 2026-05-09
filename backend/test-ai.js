
// 1. Dán cứng API Key của bạn vào đây để loại trừ lỗi do file .env
const API_KEY = "AIzaSyAhJdGB0b1ZXgjQTybdfRrKZF2zwPBLrtY"; // Ví dụ: AIzaSyDm...

async function checkModels() {
    console.log("Đang hỏi Google xem API Key này được phép dùng những model nào...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        
        if (data.models) {
            console.log("\n🎉 DANH SÁCH MODEL BẠN CÓ THỂ DÙNG:");
            data.models.forEach(m => {
                // Lọc ra những model dùng để chat (generateContent)
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`👉 ${m.name.replace('models/', '')}`);
                }
            });
            console.log("\n💡 HƯỚNG DẪN: Hãy copy một cái tên bất kỳ ở trên (ưu tiên có chữ pro hoặc flash) và dán vào code NestJS của bạn!");
        } else {
            console.log("Google trả về lỗi lạ:", data);
        }
    } catch (error) {
        console.error("Lỗi mạng:", error);
    }
}

checkModels();