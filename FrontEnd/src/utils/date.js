const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n) => String(n).padStart(2, '0');

/** NOV 06 */
export const chipDate = (d) => `${MON_EN[d.getMonth()]} ${pad(d.getDate())}`;
/** 금요일 */
export const dowLong = (d) => `${DOW_KO[d.getDay()]}요일`;
/** 2026.11.06 (FRI) */
export const fullDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${DOW_EN[d.getDay()]})`;
/** 2026.11.06 */
export const stampDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
/** 11.4 (수) */
export const shortDate = (d) => `${d.getMonth() + 1}.${d.getDate()} (${DOW_KO[d.getDay()]})`;
/** 11:20 */
export const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
