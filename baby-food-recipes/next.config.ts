import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더의 lockfile이 루트로 잡히는 것 방지
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
