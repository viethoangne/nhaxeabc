import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import axios from 'axios';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          
          const res = await axios.post(`${apiUrl}/auth/google-login`, {
            email: user.email,
            name: user.name,
            picture: user.image,
          }, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });

          if (res.data?.user?.id) {
            (user as any).id = res.data.user.id;
            // 🟢 1. HỨNG ROLE TỪ NESTJS TRẢ VỀ VÀ GẮN VÀO USER
            (user as any).role = res.data.user.role || 'CUSTOMER'; 
            return true; 
          }
          
          console.error("Backend không trả về ID người dùng");
          return false;
        } catch (error: any) {
          console.error("LỖI KẾT NỐI NESTJS:", error.response?.data || error.message);
          return false; 
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        // 🟢 2. TRUYỀN ROLE VÀO TOKEN BẢO MẬT
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        // 🟢 3. ĐẨY ROLE TỪ TOKEN RA SESSION ĐỂ FRONTEND SỬ DỤNG
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', 
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };