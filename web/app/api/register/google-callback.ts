import { OAuth2Client } from 'google-auth-library';
import { NextApiRequest, NextApiResponse } from 'next';

// Khai báo các biến môi trường cho clientId và clientSecret
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const oauth2Client = new OAuth2Client(clientId, clientSecret);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' }); // Chỉ cho phép POST
  }

  try {
    const { token } = req.body;  // Lấy token từ body request

    if (!token) {
      return res.status(400).json({ error: 'Token không hợp lệ' });
    }

    // Xác minh token từ Google OAuth
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: clientId,  // Chỉ định client ID của ứng dụng
    });

    // Lấy thông tin người dùng từ payload của ticket
    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name;
    const picture = payload?.picture; // Thêm thông tin ảnh đại diện (nếu có)

    if (!email) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    // Tiến hành xử lý người dùng (ví dụ tạo tài khoản mới hoặc đăng nhập)
    // Bạn có thể lưu thông tin người dùng vào cơ sở dữ liệu hoặc kiểm tra người dùng có tồn tại không

    // Ví dụ: Giả sử người dùng chưa tồn tại trong cơ sở dữ liệu và cần tạo mới
    // const user = await createOrGetUser(email, name, picture);

    // Bạn có thể tạo một JWT hoặc session để trả về cho frontend
    // const token = generateJWT(user);

    // Trả về thông tin thành công
    return res.status(200).json({ message: 'Đăng nhập thành công', email, name, picture });
  } catch (error) {
    console.error('Error during Google OAuth:', error);
    return res.status(500).json({ error: 'Đã có lỗi xảy ra trong quá trình xác thực' });
  }
}
