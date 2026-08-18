export interface FoodLocationOption {
  code: string;
  name: string;
}

const ISO_COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

export function getCountryOptions(locale = "zh-CN"): FoodLocationOption[] {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  return ISO_COUNTRY_CODES.map((code) => ({ code, name: displayNames.of(code) ?? code }))
    .sort((left, right) => {
      if (left.code === "CN") return -1;
      if (right.code === "CN") return 1;
      return left.name.localeCompare(right.name, locale);
    });
}

export const chinaRegions: FoodLocationOption[] = [
  ["CN-BJ", "北京市"], ["CN-TJ", "天津市"], ["CN-HE", "河北省"],
  ["CN-SX", "山西省"], ["CN-NM", "内蒙古自治区"], ["CN-LN", "辽宁省"],
  ["CN-JL", "吉林省"], ["CN-HL", "黑龙江省"], ["CN-SH", "上海市"],
  ["CN-JS", "江苏省"], ["CN-ZJ", "浙江省"], ["CN-AH", "安徽省"],
  ["CN-FJ", "福建省"], ["CN-JX", "江西省"], ["CN-SD", "山东省"],
  ["CN-HA", "河南省"], ["CN-HB", "湖北省"], ["CN-HN", "湖南省"],
  ["CN-GD", "广东省"], ["CN-GX", "广西壮族自治区"], ["CN-HI", "海南省"],
  ["CN-CQ", "重庆市"], ["CN-SC", "四川省"], ["CN-GZ", "贵州省"],
  ["CN-YN", "云南省"], ["CN-XZ", "西藏自治区"], ["CN-SN", "陕西省"],
  ["CN-GS", "甘肃省"], ["CN-QH", "青海省"], ["CN-NX", "宁夏回族自治区"],
  ["CN-XJ", "新疆维吾尔自治区"], ["CN-HK", "香港特别行政区"],
  ["CN-MO", "澳门特别行政区"], ["CN-TW", "台湾省"],
].map(([code, name]) => ({ code, name }));

const cityPairs: Record<string, string[]> = {
  "CN-BJ": ["北京市"], "CN-TJ": ["天津市"], "CN-SH": ["上海市"], "CN-CQ": ["重庆市"],
  "CN-GD": ["广州市", "深圳市", "珠海市", "佛山市", "东莞市", "中山市", "惠州市", "汕头市", "江门市"],
  "CN-JS": ["南京市", "苏州市", "无锡市", "常州市", "南通市", "扬州市", "徐州市"],
  "CN-ZJ": ["杭州市", "宁波市", "温州市", "嘉兴市", "绍兴市", "金华市", "台州市"],
  "CN-SC": ["成都市", "绵阳市", "乐山市", "德阳市", "宜宾市", "泸州市"],
  "CN-HB": ["武汉市", "宜昌市", "襄阳市", "荆州市"],
  "CN-HN": ["长沙市", "株洲市", "湘潭市", "衡阳市", "岳阳市"],
  "CN-FJ": ["福州市", "厦门市", "泉州市", "漳州市"],
  "CN-SD": ["济南市", "青岛市", "烟台市", "潍坊市", "威海市"],
  "CN-HA": ["郑州市", "洛阳市", "开封市", "新乡市"],
  "CN-AH": ["合肥市", "芜湖市", "黄山市"],
  "CN-YN": ["昆明市", "大理市", "丽江市", "西双版纳傣族自治州"],
  "CN-SN": ["西安市", "咸阳市", "宝鸡市"],
  "CN-LN": ["沈阳市", "大连市", "鞍山市"],
  "CN-HL": ["哈尔滨市", "齐齐哈尔市", "牡丹江市"],
  "CN-JL": ["长春市", "吉林市", "延边朝鲜族自治州"],
  "CN-JX": ["南昌市", "赣州市", "景德镇市", "九江市"],
  "CN-GX": ["南宁市", "桂林市", "柳州市", "北海市"],
  "CN-HI": ["海口市", "三亚市"],
  "CN-GZ": ["贵阳市", "遵义市"],
  "CN-HE": ["石家庄市", "唐山市", "秦皇岛市", "保定市"],
  "CN-SX": ["太原市", "大同市"],
  "CN-NM": ["呼和浩特市", "包头市", "鄂尔多斯市"],
  "CN-GS": ["兰州市", "敦煌市", "天水市"],
  "CN-QH": ["西宁市", "海西蒙古族藏族自治州"],
  "CN-NX": ["银川市"], "CN-XJ": ["乌鲁木齐市", "喀什市", "伊犁哈萨克自治州"],
  "CN-XZ": ["拉萨市"], "CN-HK": ["香港"], "CN-MO": ["澳门"], "CN-TW": ["台北市", "高雄市", "台中市", "台南市"],
};

export function getChinaCityOptions(regionCode: string): FoodLocationOption[] {
  return (cityPairs[regionCode] ?? []).map((name) => ({
    code: `${regionCode}:${manualLocationCode(name)?.slice("manual:".length) ?? "city"}`,
    name,
  }));
}

export function manualLocationCode(value: string) {
  const normalized = value.trim().toLocaleLowerCase("zh-CN").replace(/\s+/gu, " ");
  if (!normalized) return undefined;
  let hash = 2_166_136_261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `manual:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
