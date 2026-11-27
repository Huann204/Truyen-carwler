import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  getAdminSecret,
  isAdminAuthenticated,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authRequired = Boolean(getAdminSecret());
  return NextResponse.json({
    authRequired,
    authenticated: isAdminAuthenticated(req),
  });
}

export async function POST(req: NextRequest) {
  const secret = getAdminSecret();
  if (!secret) {
    return NextResponse.json({ ok: true, authRequired: false });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu đăng nhập không hợp lệ" },
      { status: 400 }
    );
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { error: "Mật khẩu quản trị không đúng" },
      { status: 401 }
    );
  }

  const token = createSessionToken(secret);
  const res = NextResponse.json({ ok: true, authRequired: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
