export interface CountryKit {
  code: string   // 3-letter display code
  name: string   // full name
  flag: string   // emoji flag
  home: string   // primary shirt hex
  away: string   // shorts / secondary hex
  text: string   // '#ffffff' or '#000000' — readable on home bg
}

export const COUNTRIES: Record<string, CountryKit> = {
  // CONMEBOL
  ARG: { code:'ARG', name:'Argentina',    flag:'🇦🇷', home:'#74ACDF', away:'#FFFFFF', text:'#000000' },
  BRA: { code:'BRA', name:'Brazil',       flag:'🇧🇷', home:'#FFDF00', away:'#009C3B', text:'#000000' },
  COL: { code:'COL', name:'Colombia',     flag:'🇨🇴', home:'#FCD116', away:'#003087', text:'#000000' },
  ECU: { code:'ECU', name:'Ecuador',      flag:'🇪🇨', home:'#FFD100', away:'#0033A0', text:'#000000' },
  URU: { code:'URU', name:'Uruguay',      flag:'🇺🇾', home:'#5CBCE1', away:'#FFFFFF', text:'#000000' },
  CHI: { code:'CHI', name:'Chile',        flag:'🇨🇱', home:'#D52B1E', away:'#FFFFFF', text:'#ffffff' },
  PER: { code:'PER', name:'Peru',         flag:'🇵🇪', home:'#FFFFFF', away:'#D91023', text:'#000000' },
  PAR: { code:'PAR', name:'Paraguay',     flag:'🇵🇾', home:'#D52B1E', away:'#FFFFFF', text:'#ffffff' },
  BOL: { code:'BOL', name:'Bolivia',      flag:'🇧🇴', home:'#007A3D', away:'#D52B1E', text:'#ffffff' },
  VEN: { code:'VEN', name:'Venezuela',    flag:'🇻🇪', home:'#CF142B', away:'#FFFFFF', text:'#ffffff' },
  // CONCACAF
  USA: { code:'USA', name:'USA',          flag:'🇺🇸', home:'#002868', away:'#BF0A30', text:'#ffffff' },
  MEX: { code:'MEX', name:'Mexico',       flag:'🇲🇽', home:'#006847', away:'#CE1126', text:'#ffffff' },
  CAN: { code:'CAN', name:'Canada',       flag:'🇨🇦', home:'#FF0000', away:'#FFFFFF', text:'#ffffff' },
  CRC: { code:'CRC', name:'Costa Rica',   flag:'🇨🇷', home:'#002B7F', away:'#CE1126', text:'#ffffff' },
  PAN: { code:'PAN', name:'Panama',       flag:'🇵🇦', home:'#FFFFFF', away:'#D21034', text:'#000000' },
  HON: { code:'HON', name:'Honduras',     flag:'🇭🇳', home:'#003DA5', away:'#FFFFFF', text:'#ffffff' },
  JAM: { code:'JAM', name:'Jamaica',      flag:'🇯🇲', home:'#000000', away:'#FED100', text:'#ffffff' },
  GUA: { code:'GUA', name:'Guatemala',    flag:'🇬🇹', home:'#003DA5', away:'#FFFFFF', text:'#ffffff' },
  // UEFA
  ENG: { code:'ENG', name:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', home:'#EEEEEE', away:'#012169', text:'#000000' },
  FRA: { code:'FRA', name:'France',       flag:'🇫🇷', home:'#003189', away:'#FFFFFF', text:'#ffffff' },
  GER: { code:'GER', name:'Germany',      flag:'🇩🇪', home:'#EEEEEE', away:'#000000', text:'#000000' },
  ESP: { code:'ESP', name:'Spain',        flag:'🇪🇸', home:'#C60B1E', away:'#FFC400', text:'#ffffff' },
  ITA: { code:'ITA', name:'Italy',        flag:'🇮🇹', home:'#003399', away:'#FFFFFF', text:'#ffffff' },
  POR: { code:'POR', name:'Portugal',     flag:'🇵🇹', home:'#BE1C22', away:'#006600', text:'#ffffff' },
  NED: { code:'NED', name:'Netherlands',  flag:'🇳🇱', home:'#FF6600', away:'#003DA5', text:'#ffffff' },
  BEL: { code:'BEL', name:'Belgium',      flag:'🇧🇪', home:'#C00030', away:'#000000', text:'#ffffff' },
  CRO: { code:'CRO', name:'Croatia',      flag:'🇭🇷', home:'#C8102E', away:'#FFFFFF', text:'#ffffff' },
  SUI: { code:'SUI', name:'Switzerland',  flag:'🇨🇭', home:'#FF0000', away:'#FFFFFF', text:'#ffffff' },
  DEN: { code:'DEN', name:'Denmark',      flag:'🇩🇰', home:'#C60C30', away:'#FFFFFF', text:'#ffffff' },
  POL: { code:'POL', name:'Poland',       flag:'🇵🇱', home:'#FFFFFF', away:'#DC143C', text:'#000000' },
  AUT: { code:'AUT', name:'Austria',      flag:'🇦🇹', home:'#ED2939', away:'#FFFFFF', text:'#ffffff' },
  SCO: { code:'SCO', name:'Scotland',     flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', home:'#003DA5', away:'#FFFFFF', text:'#ffffff' },
  WAL: { code:'WAL', name:'Wales',        flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿', home:'#C8102E', away:'#1C4573', text:'#ffffff' },
  TUR: { code:'TUR', name:'Türkiye',      flag:'🇹🇷', home:'#E30A17', away:'#FFFFFF', text:'#ffffff' },
  SRB: { code:'SRB', name:'Serbia',       flag:'🇷🇸', home:'#C6363C', away:'#FFFFFF', text:'#ffffff' },
  HUN: { code:'HUN', name:'Hungary',      flag:'🇭🇺', home:'#CE2939', away:'#FFFFFF', text:'#ffffff' },
  SVK: { code:'SVK', name:'Slovakia',     flag:'🇸🇰', home:'#0B4EA2', away:'#FFFFFF', text:'#ffffff' },
  SLO: { code:'SLO', name:'Slovenia',     flag:'🇸🇮', home:'#003DA5', away:'#FFFFFF', text:'#ffffff' },
  GEO: { code:'GEO', name:'Georgia',      flag:'🇬🇪', home:'#FFFFFF', away:'#FF0000', text:'#000000' },
  ALB: { code:'ALB', name:'Albania',      flag:'🇦🇱', home:'#E41E20', away:'#000000', text:'#ffffff' },
  ROU: { code:'ROU', name:'Romania',      flag:'🇷🇴', home:'#FFD700', away:'#002B7F', text:'#000000' },
  UKR: { code:'UKR', name:'Ukraine',      flag:'🇺🇦', home:'#FFD700', away:'#005BBB', text:'#000000' },
  NOR: { code:'NOR', name:'Norway',       flag:'🇳🇴', home:'#EF2B2D', away:'#FFFFFF', text:'#ffffff' },
  SWE: { code:'SWE', name:'Sweden',       flag:'🇸🇪', home:'#006AA7', away:'#FECC02', text:'#ffffff' },
  GRE: { code:'GRE', name:'Greece',       flag:'🇬🇷', home:'#0D5EAF', away:'#FFFFFF', text:'#ffffff' },
  CZE: { code:'CZE', name:'Czechia',      flag:'🇨🇿', home:'#D7141A', away:'#FFFFFF', text:'#ffffff' },
  BIH: { code:'BIH', name:'Bosnia',       flag:'🇧🇦', home:'#002868', away:'#FFD700', text:'#ffffff' },
  MNE: { code:'MNE', name:'Montenegro',   flag:'🇲🇪', home:'#D4AF37', away:'#D21034', text:'#000000' },
  MKD: { code:'MKD', name:'N. Macedonia', flag:'🇲🇰', home:'#CE2028', away:'#FFE000', text:'#ffffff' },
  LUX: { code:'LUX', name:'Luxembourg',   flag:'🇱🇺', home:'#EF3340', away:'#00A3E0', text:'#ffffff' },
  ISL: { code:'ISL', name:'Iceland',      flag:'🇮🇸', home:'#003897', away:'#FFFFFF', text:'#ffffff' },
  FIN: { code:'FIN', name:'Finland',      flag:'🇫🇮', home:'#FFFFFF', away:'#003580', text:'#000000' },
  IRL: { code:'IRL', name:'Ireland',      flag:'🇮🇪', home:'#169B62', away:'#FFFFFF', text:'#ffffff' },
  BUL: { code:'BUL', name:'Bulgaria',     flag:'🇧🇬', home:'#FFFFFF', away:'#00966E', text:'#000000' },
  // CAF
  MAR: { code:'MAR', name:'Morocco',      flag:'🇲🇦', home:'#C1272D', away:'#FFFFFF', text:'#ffffff' },
  SEN: { code:'SEN', name:'Senegal',      flag:'🇸🇳', home:'#009A44', away:'#FFFFFF', text:'#ffffff' },
  NGA: { code:'NGA', name:'Nigeria',      flag:'🇳🇬', home:'#008751', away:'#FFFFFF', text:'#ffffff' },
  CMR: { code:'CMR', name:'Cameroon',     flag:'🇨🇲', home:'#007A3D', away:'#CE1126', text:'#ffffff' },
  EGY: { code:'EGY', name:'Egypt',        flag:'🇪🇬', home:'#CE1126', away:'#FFFFFF', text:'#ffffff' },
  GHA: { code:'GHA', name:'Ghana',        flag:'🇬🇭', home:'#FFFFFF', away:'#006B3F', text:'#000000' },
  CIV: { code:'CIV', name:'Ivory Coast',  flag:'🇨🇮', home:'#F77F00', away:'#009A44', text:'#ffffff' },
  ZAF: { code:'ZAF', name:'South Africa', flag:'🇿🇦', home:'#007A4D', away:'#FFB81C', text:'#ffffff' },
  TUN: { code:'TUN', name:'Tunisia',      flag:'🇹🇳', home:'#E70013', away:'#FFFFFF', text:'#ffffff' },
  ALG: { code:'ALG', name:'Algeria',      flag:'🇩🇿', home:'#FFFFFF', away:'#006233', text:'#000000' },
  // AFC
  JPN: { code:'JPN', name:'Japan',        flag:'🇯🇵', home:'#003DA5', away:'#FFFFFF', text:'#ffffff' },
  KOR: { code:'KOR', name:'South Korea',  flag:'🇰🇷', home:'#C00030', away:'#FFFFFF', text:'#ffffff' },
  AUS: { code:'AUS', name:'Australia',    flag:'🇦🇺', home:'#FFD700', away:'#00843D', text:'#000000' },
  IRN: { code:'IRN', name:'Iran',         flag:'🇮🇷', home:'#FFFFFF', away:'#239F40', text:'#000000' },
  KSA: { code:'KSA', name:'Saudi Arabia', flag:'🇸🇦', home:'#165E2D', away:'#FFFFFF', text:'#ffffff' },
  QAT: { code:'QAT', name:'Qatar',        flag:'🇶🇦', home:'#8D1B3D', away:'#FFFFFF', text:'#ffffff' },
  IRQ: { code:'IRQ', name:'Iraq',         flag:'🇮🇶', home:'#CE1126', away:'#FFFFFF', text:'#ffffff' },
  JOR: { code:'JOR', name:'Jordan',       flag:'🇯🇴', home:'#007A3D', away:'#CE1126', text:'#ffffff' },
  UZB: { code:'UZB', name:'Uzbekistan',   flag:'🇺🇿', home:'#1EB53A', away:'#FFFFFF', text:'#ffffff' },
  // OFC
  NZL: { code:'NZL', name:'New Zealand',  flag:'🇳🇿', home:'#000000', away:'#FFFFFF', text:'#ffffff' },
}

const FALLBACK_TEAMS: [CountryKit, CountryKit] = [
  { code:'RED', name:'Red Team',  flag:'🔴', home:'#c42020', away:'#ffffff', text:'#ffffff' },
  { code:'BLU', name:'Blue Team', flag:'🔵', home:'#1a30b8', away:'#f8f8f8', text:'#ffffff' },
]

export function getCountry(code: string, slot: 0 | 1): CountryKit {
  return COUNTRIES[code.toUpperCase()] ?? FALLBACK_TEAMS[slot]
}
