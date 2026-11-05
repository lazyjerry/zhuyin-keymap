// 以常見密碼標準檢核。標準內容整理自公開文件，僅檢查可由字串本身判斷的條款。

const COMMON = new Set(`123456 12345678 123456789 1234567890 12345 1234567 password password1 password123 qwerty
qwerty123 qwertyuiop abc123 abcd1234 111111 000000 123123 654321 666666 888888 987654321 123321 112233 121212
iloveyou admin admin123 root letmein welcome welcome1 monkey dragon sunshine princess football baseball master
shadow superman batman trustno1 starwars passw0rd p@ssw0rd p@ssword 1q2w3e4r 1q2w3e4r5t 1qaz2wsx 1qaz2wsx3edc
zaq12wsx qazwsx asdfgh asdfghjkl zxcvbnm zxcvbn a123456 aa123456 a12345678 abc123456 qq123456 test test123
guest changeme secret login access hello hello123 whatever freedom michael jordan23 charlie 147258369 159753
789456123 5201314 1314520 520520 woaini woaini1314 iloveyou1 computer internet google samsung apple 0987654321
taiwan taipei asd123 asd123456 qwe123 qwe123456 a1234567 a123123 aaaaaa abcdef abcdefg 11111111 00000000
88888888 12341234 11223344 q1w2e3r4 q1w2e3r4t5 1234qwer qwer1234 ji394su3 su3cl3`.split(/\s+/));

export const isCommon = (pw) => COMMON.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw) || /^(0123456789|1234567890|abcdefghij)/i.test(pw);

const categories = (pw) => ({
  upper: /\p{Lu}/u.test(pw),
  lower: /\p{Ll}/u.test(pw),
  digit: /\p{Nd}/u.test(pw),
  symbol: /[^\p{L}\p{Nd}]/u.test(pw),
  otherLetter: /[\p{Lo}\p{Lm}]/u.test(pw),
});

export function evaluate(pw) {
  const len = Array.from(pw).length;
  const cat = categories(pw);
  const common = isCommon(pw);
  const winGroups = [cat.upper, cat.lower, cat.digit, cat.symbol, cat.otherLetter].filter(Boolean).length;
  const rule = (label, pass) => ({ label, pass });

  const standards = [
    {
      id: "nist-single", name: "NIST SP 800-63B-4（密碼為唯一驗證因子）", ref: "2025 年第 4 版 §3.1.1.2",
      rules: [rule("長度至少 15 字元", len >= 15), rule("不在常見／外洩密碼清單", !common)],
      note: "不要求混合字元類別；系統應允許至少 64 字元。",
    },
    {
      id: "nist-mfa", name: "NIST SP 800-63B-4（搭配多因子驗證）", ref: "2025 年第 4 版 §3.1.1.2",
      rules: [rule("長度至少 8 字元", len >= 8), rule("不在常見／外洩密碼清單", !common)],
    },
    {
      id: "asvs", name: "OWASP ASVS 5.0", ref: "V6.2.1、V6.2.4",
      rules: [rule("長度至少 8 字元", len >= 8), rule("不在常見密碼清單", !common)],
      note: len >= 8 && len < 15 ? "已達最低要求，標準強烈建議 15 字元以上。" : "",
    },
    {
      id: "pci", name: "PCI DSS v4.0.1", ref: "要求 8.3.6",
      rules: [rule("長度至少 12 字元", len >= 12), rule("同時包含英文字母與數字", (cat.upper || cat.lower || cat.otherLetter) && cat.digit)],
    },
    {
      id: "cis", name: "CIS Benchmark（Windows 密碼原則）", ref: "最小密碼長度 14、啟用複雜度需求",
      rules: [rule("長度至少 14 字元", len >= 14), rule("符合 Windows 複雜度（五類中至少三類）", winGroups >= 3)],
    },
    {
      id: "windows", name: "Microsoft Windows 複雜度需求", ref: "Password must meet complexity requirements",
      rules: [rule("大寫、小寫、數字、符號、其他文字中至少三類", winGroups >= 3), rule("長度至少 6 字元", len >= 6)],
      note: "實際長度下限由「最小密碼長度」原則另行設定；本項不檢查是否包含帳號名稱。",
    },
    {
      id: "web", name: "一般網站常見規則", ref: "業界慣例，非正式標準",
      rules: [
        rule("長度至少 8 字元", len >= 8), rule("包含大寫英文", cat.upper), rule("包含小寫英文", cat.lower),
        rule("包含數字", cat.digit), rule("包含特殊符號", cat.symbol),
      ],
    },
  ].map((s) => ({ ...s, pass: len > 0 && s.rules.every((r) => r.pass) }));

  const warnings = [];
  if (/\s/u.test(pw)) warnings.push("含空白字元，部分系統不接受或會自動去除前後空白。");
  if (/[^\x20-\x7e]/.test(pw)) warnings.push("含非 ASCII 字元，部分系統或裝置可能無法輸入。");
  if (len > 64) warnings.push("超過 64 字元，部分系統可能截斷。");

  const pool = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/\d/.test(pw) ? 10 : 0)
    + (/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(pw) ? 33 : 0) + (/[^\x20-\x7e]/.test(pw) ? 100 : 0);
  const entropy = len && pool ? Math.round(len * Math.log2(pool)) : 0;

  return { length: len, standards, warnings, entropy, common };
}

export function entropyLabel(bits) {
  if (bits === 0) return "等待輸入";
  if (bits < 36) return "很弱";
  if (bits < 60) return "偏弱";
  if (bits < 80) return "中等";
  if (bits < 112) return "強";
  return "很強";
}
