// Curated dataset of ~200 US universities for the chapter onboarding wizard's
// school picker. Each entry carries the school's real (approximate) primary +
// secondary brand colors so picking a school can prefill brand-primary/secondary
// and the school name/abbreviation on the live preview.
//
// Colors are web-usable approximations of each school's official athletic/brand
// palette (primary first, secondary second). They are intended as a sensible
// starting point — a chapter typically themes its site around its ORG colors, so
// these are surfaced as a swatch preview and remain fully overridable downstream.
//
// `short` is the common abbreviation (USC, UCLA, A&M, …). `state` is the USPS
// two-letter code so searchSchools can match "ohio", "OH", etc. The list leans
// heavily toward the large, Greek-active campuses called out by the product spec
// (SEC, Big Ten, Big 12, ACC, Pac-12 flagships, plus prominent privates).

export type School = {
  /** Full institution name, e.g. "University of Alabama". */
  name: string;
  /** Common short name / abbreviation, e.g. "Alabama" or "USC". */
  short: string;
  /** City the main campus sits in. */
  city: string;
  /** USPS two-letter state code, e.g. "AL". */
  state: string;
  /** [primaryHex, secondaryHex] — real (approx) school brand colors. */
  colors: [string, string];
};

export const SCHOOLS: School[] = [
  // ── SEC ──────────────────────────────────────────────────────────────
  { name: "University of Alabama", short: "Alabama", city: "Tuscaloosa", state: "AL", colors: ["#9E1B32", "#828A8F"] },
  { name: "Auburn University", short: "Auburn", city: "Auburn", state: "AL", colors: ["#0C2340", "#E87722"] },
  { name: "University of Arkansas", short: "Arkansas", city: "Fayetteville", state: "AR", colors: ["#9D2235", "#FFFFFF"] },
  { name: "University of Florida", short: "Florida", city: "Gainesville", state: "FL", colors: ["#0021A5", "#FA4616"] },
  { name: "University of Georgia", short: "Georgia", city: "Athens", state: "GA", colors: ["#BA0C2F", "#000000"] },
  { name: "University of Kentucky", short: "Kentucky", city: "Lexington", state: "KY", colors: ["#0033A0", "#FFFFFF"] },
  { name: "Louisiana State University", short: "LSU", city: "Baton Rouge", state: "LA", colors: ["#461D7C", "#FDD023"] },
  { name: "University of Mississippi", short: "Ole Miss", city: "Oxford", state: "MS", colors: ["#CE1126", "#14213D"] },
  { name: "Mississippi State University", short: "Mississippi State", city: "Starkville", state: "MS", colors: ["#660000", "#FFFFFF"] },
  { name: "University of Missouri", short: "Missouri", city: "Columbia", state: "MO", colors: ["#F1B82D", "#000000"] },
  { name: "University of South Carolina", short: "South Carolina", city: "Columbia", state: "SC", colors: ["#73000A", "#000000"] },
  { name: "University of Tennessee", short: "Tennessee", city: "Knoxville", state: "TN", colors: ["#FF8200", "#58595B"] },
  { name: "Texas A&M University", short: "Texas A&M", city: "College Station", state: "TX", colors: ["#500000", "#FFFFFF"] },
  { name: "University of Texas at Austin", short: "Texas", city: "Austin", state: "TX", colors: ["#BF5700", "#333F48"] },
  { name: "Vanderbilt University", short: "Vanderbilt", city: "Nashville", state: "TN", colors: ["#866D4B", "#000000"] },

  // ── Big Ten ──────────────────────────────────────────────────────────
  { name: "University of Illinois Urbana-Champaign", short: "Illinois", city: "Champaign", state: "IL", colors: ["#13294B", "#E84A27"] },
  { name: "Indiana University Bloomington", short: "Indiana", city: "Bloomington", state: "IN", colors: ["#990000", "#EEEDEB"] },
  { name: "University of Iowa", short: "Iowa", city: "Iowa City", state: "IA", colors: ["#FFCD00", "#000000"] },
  { name: "University of Maryland", short: "Maryland", city: "College Park", state: "MD", colors: ["#E03A3E", "#FFD520"] },
  { name: "University of Michigan", short: "Michigan", city: "Ann Arbor", state: "MI", colors: ["#00274C", "#FFCB05"] },
  { name: "Michigan State University", short: "Michigan State", city: "East Lansing", state: "MI", colors: ["#18453B", "#FFFFFF"] },
  { name: "University of Minnesota", short: "Minnesota", city: "Minneapolis", state: "MN", colors: ["#7A0019", "#FFCC33"] },
  { name: "University of Nebraska-Lincoln", short: "Nebraska", city: "Lincoln", state: "NE", colors: ["#E41C38", "#FFFFFF"] },
  { name: "Northwestern University", short: "Northwestern", city: "Evanston", state: "IL", colors: ["#4E2A84", "#FFFFFF"] },
  { name: "Ohio State University", short: "Ohio State", city: "Columbus", state: "OH", colors: ["#BB0000", "#666666"] },
  { name: "Pennsylvania State University", short: "Penn State", city: "University Park", state: "PA", colors: ["#041E42", "#FFFFFF"] },
  { name: "Purdue University", short: "Purdue", city: "West Lafayette", state: "IN", colors: ["#CEB888", "#000000"] },
  { name: "Rutgers University", short: "Rutgers", city: "New Brunswick", state: "NJ", colors: ["#CC0033", "#5F6A72"] },
  { name: "University of Wisconsin-Madison", short: "Wisconsin", city: "Madison", state: "WI", colors: ["#C5050C", "#FFFFFF"] },
  { name: "University of California, Los Angeles", short: "UCLA", city: "Los Angeles", state: "CA", colors: ["#2774AE", "#FFD100"] },
  { name: "University of Southern California", short: "USC", city: "Los Angeles", state: "CA", colors: ["#990000", "#FFCC00"] },
  { name: "University of Oregon", short: "Oregon", city: "Eugene", state: "OR", colors: ["#154733", "#FEE123"] },
  { name: "University of Washington", short: "Washington", city: "Seattle", state: "WA", colors: ["#4B2E83", "#B7A57A"] },

  // ── Big 12 ───────────────────────────────────────────────────────────
  { name: "Baylor University", short: "Baylor", city: "Waco", state: "TX", colors: ["#154734", "#FFB81C"] },
  { name: "Brigham Young University", short: "BYU", city: "Provo", state: "UT", colors: ["#002E5D", "#FFFFFF"] },
  { name: "University of Cincinnati", short: "Cincinnati", city: "Cincinnati", state: "OH", colors: ["#E00122", "#000000"] },
  { name: "University of Houston", short: "Houston", city: "Houston", state: "TX", colors: ["#C8102E", "#FFFFFF"] },
  { name: "Iowa State University", short: "Iowa State", city: "Ames", state: "IA", colors: ["#C8102E", "#F1BE48"] },
  { name: "University of Kansas", short: "Kansas", city: "Lawrence", state: "KS", colors: ["#0051BA", "#E8000D"] },
  { name: "Kansas State University", short: "Kansas State", city: "Manhattan", state: "KS", colors: ["#512888", "#FFFFFF"] },
  { name: "Oklahoma State University", short: "Oklahoma State", city: "Stillwater", state: "OK", colors: ["#FF7300", "#000000"] },
  { name: "Texas Christian University", short: "TCU", city: "Fort Worth", state: "TX", colors: ["#4D1979", "#A3A9AC"] },
  { name: "Texas Tech University", short: "Texas Tech", city: "Lubbock", state: "TX", colors: ["#CC0000", "#000000"] },
  { name: "University of Central Florida", short: "UCF", city: "Orlando", state: "FL", colors: ["#000000", "#BA9B37"] },
  { name: "West Virginia University", short: "West Virginia", city: "Morgantown", state: "WV", colors: ["#002855", "#EAAA00"] },
  { name: "Arizona State University", short: "Arizona State", city: "Tempe", state: "AZ", colors: ["#8C1D40", "#FFC627"] },
  { name: "University of Arizona", short: "Arizona", city: "Tucson", state: "AZ", colors: ["#AB0520", "#0C234B"] },
  { name: "University of Colorado Boulder", short: "Colorado", city: "Boulder", state: "CO", colors: ["#CFB87C", "#000000"] },
  { name: "University of Utah", short: "Utah", city: "Salt Lake City", state: "UT", colors: ["#CC0000", "#FFFFFF"] },

  // ── ACC ──────────────────────────────────────────────────────────────
  { name: "Boston College", short: "Boston College", city: "Chestnut Hill", state: "MA", colors: ["#8C2232", "#B29D6C"] },
  { name: "Clemson University", short: "Clemson", city: "Clemson", state: "SC", colors: ["#F56600", "#522D80"] },
  { name: "Duke University", short: "Duke", city: "Durham", state: "NC", colors: ["#003087", "#FFFFFF"] },
  { name: "Florida State University", short: "FSU", city: "Tallahassee", state: "FL", colors: ["#782F40", "#CEB888"] },
  { name: "Georgia Institute of Technology", short: "Georgia Tech", city: "Atlanta", state: "GA", colors: ["#B3A369", "#003057"] },
  { name: "University of Louisville", short: "Louisville", city: "Louisville", state: "KY", colors: ["#AD0000", "#000000"] },
  { name: "University of Miami", short: "Miami", city: "Coral Gables", state: "FL", colors: ["#F47321", "#005030"] },
  { name: "University of North Carolina at Chapel Hill", short: "North Carolina", city: "Chapel Hill", state: "NC", colors: ["#7BAFD4", "#FFFFFF"] },
  { name: "North Carolina State University", short: "NC State", city: "Raleigh", state: "NC", colors: ["#CC0000", "#FFFFFF"] },
  { name: "University of Notre Dame", short: "Notre Dame", city: "Notre Dame", state: "IN", colors: ["#0C2340", "#C99700"] },
  { name: "University of Pittsburgh", short: "Pitt", city: "Pittsburgh", state: "PA", colors: ["#003594", "#FFB81C"] },
  { name: "Syracuse University", short: "Syracuse", city: "Syracuse", state: "NY", colors: ["#F76900", "#000E54"] },
  { name: "University of Virginia", short: "Virginia", city: "Charlottesville", state: "VA", colors: ["#232D4B", "#F84C1E"] },
  { name: "Virginia Tech", short: "Virginia Tech", city: "Blacksburg", state: "VA", colors: ["#630031", "#CF4420"] },
  { name: "Wake Forest University", short: "Wake Forest", city: "Winston-Salem", state: "NC", colors: ["#9E7E38", "#000000"] },
  { name: "Stanford University", short: "Stanford", city: "Stanford", state: "CA", colors: ["#8C1515", "#FFFFFF"] },
  { name: "University of California, Berkeley", short: "Cal", city: "Berkeley", state: "CA", colors: ["#003262", "#FDB515"] },
  { name: "Southern Methodist University", short: "SMU", city: "Dallas", state: "TX", colors: ["#0033A0", "#CC0035"] },

  // ── Pac-12 / West (remaining flagships) ──────────────────────────────
  { name: "Oregon State University", short: "Oregon State", city: "Corvallis", state: "OR", colors: ["#DC4405", "#000000"] },
  { name: "Washington State University", short: "Washington State", city: "Pullman", state: "WA", colors: ["#981E32", "#5E6A71"] },
  { name: "University of California, Davis", short: "UC Davis", city: "Davis", state: "CA", colors: ["#022851", "#FFBF00"] },
  { name: "University of California, Santa Barbara", short: "UC Santa Barbara", city: "Santa Barbara", state: "CA", colors: ["#003660", "#FEBC11"] },
  { name: "University of California, Irvine", short: "UC Irvine", city: "Irvine", state: "CA", colors: ["#0064A4", "#FFD200"] },
  { name: "University of California, San Diego", short: "UC San Diego", city: "La Jolla", state: "CA", colors: ["#182B49", "#FFCD00"] },
  { name: "San Diego State University", short: "San Diego State", city: "San Diego", state: "CA", colors: ["#A6192E", "#000000"] },
  { name: "California Polytechnic State University", short: "Cal Poly", city: "San Luis Obispo", state: "CA", colors: ["#154734", "#BD8B13"] },
  { name: "San Jose State University", short: "San Jose State", city: "San Jose", state: "CA", colors: ["#0055A2", "#E5A823"] },
  { name: "University of Nevada, Las Vegas", short: "UNLV", city: "Las Vegas", state: "NV", colors: ["#B10202", "#666666"] },
  { name: "University of Nevada, Reno", short: "Nevada", city: "Reno", state: "NV", colors: ["#003366", "#807F84"] },
  { name: "Boise State University", short: "Boise State", city: "Boise", state: "ID", colors: ["#0033A0", "#D64309"] },
  { name: "University of New Mexico", short: "New Mexico", city: "Albuquerque", state: "NM", colors: ["#BA0C2F", "#63666A"] },

  // ── Ivy League ───────────────────────────────────────────────────────
  { name: "Cornell University", short: "Cornell", city: "Ithaca", state: "NY", colors: ["#B31B1B", "#FFFFFF"] },
  { name: "University of Pennsylvania", short: "Penn", city: "Philadelphia", state: "PA", colors: ["#011F5B", "#990000"] },
  { name: "Harvard University", short: "Harvard", city: "Cambridge", state: "MA", colors: ["#A51C30", "#000000"] },
  { name: "Yale University", short: "Yale", city: "New Haven", state: "CT", colors: ["#00356B", "#FFFFFF"] },
  { name: "Princeton University", short: "Princeton", city: "Princeton", state: "NJ", colors: ["#FF6600", "#000000"] },
  { name: "Brown University", short: "Brown", city: "Providence", state: "RI", colors: ["#4E3629", "#ED1C24"] },
  { name: "Columbia University", short: "Columbia", city: "New York", state: "NY", colors: ["#9BCBEB", "#FFFFFF"] },
  { name: "Dartmouth College", short: "Dartmouth", city: "Hanover", state: "NH", colors: ["#00693E", "#FFFFFF"] },

  // ── Northeast / Mid-Atlantic ─────────────────────────────────────────
  { name: "Boston University", short: "Boston U", city: "Boston", state: "MA", colors: ["#CC0000", "#000000"] },
  { name: "Northeastern University", short: "Northeastern", city: "Boston", state: "MA", colors: ["#C8102E", "#000000"] },
  { name: "University of Connecticut", short: "UConn", city: "Storrs", state: "CT", colors: ["#000E2F", "#FFFFFF"] },
  { name: "University of Massachusetts Amherst", short: "UMass", city: "Amherst", state: "MA", colors: ["#881C1C", "#000000"] },
  { name: "University of New Hampshire", short: "New Hampshire", city: "Durham", state: "NH", colors: ["#003591", "#FFFFFF"] },
  { name: "University of Rhode Island", short: "Rhode Island", city: "Kingston", state: "RI", colors: ["#002147", "#7CA9D6"] },
  { name: "University of Vermont", short: "Vermont", city: "Burlington", state: "VT", colors: ["#154734", "#FFB81C"] },
  { name: "University of Delaware", short: "Delaware", city: "Newark", state: "DE", colors: ["#00539F", "#FFD200"] },
  { name: "Pennsylvania State University - Behrend", short: "Penn State Behrend", city: "Erie", state: "PA", colors: ["#041E42", "#1E407C"] },
  { name: "Temple University", short: "Temple", city: "Philadelphia", state: "PA", colors: ["#9D2235", "#FFFFFF"] },
  { name: "Drexel University", short: "Drexel", city: "Philadelphia", state: "PA", colors: ["#07294D", "#FFC600"] },
  { name: "Villanova University", short: "Villanova", city: "Villanova", state: "PA", colors: ["#00205B", "#13B5EA"] },
  { name: "George Washington University", short: "GW", city: "Washington", state: "DC", colors: ["#033C5A", "#A89968"] },
  { name: "Georgetown University", short: "Georgetown", city: "Washington", state: "DC", colors: ["#041E42", "#8A8B8C"] },
  { name: "American University", short: "American", city: "Washington", state: "DC", colors: ["#C5050C", "#005596"] },
  { name: "University of Maryland, Baltimore County", short: "UMBC", city: "Baltimore", state: "MD", colors: ["#FDB515", "#000000"] },
  { name: "Towson University", short: "Towson", city: "Towson", state: "MD", colors: ["#FFB81C", "#000000"] },
  { name: "Hofstra University", short: "Hofstra", city: "Hempstead", state: "NY", colors: ["#003591", "#FFB81C"] },
  { name: "Stony Brook University", short: "Stony Brook", city: "Stony Brook", state: "NY", colors: ["#990000", "#000000"] },
  { name: "University at Buffalo", short: "Buffalo", city: "Buffalo", state: "NY", colors: ["#005BBB", "#FFFFFF"] },
  { name: "Binghamton University", short: "Binghamton", city: "Binghamton", state: "NY", colors: ["#005A43", "#000000"] },
  { name: "New York University", short: "NYU", city: "New York", state: "NY", colors: ["#57068C", "#000000"] },
  { name: "Fordham University", short: "Fordham", city: "New York", state: "NY", colors: ["#860038", "#FFFFFF"] },
  { name: "Seton Hall University", short: "Seton Hall", city: "South Orange", state: "NJ", colors: ["#004488", "#A6192E"] },

  // ── Southeast (remaining) ────────────────────────────────────────────
  { name: "University of South Florida", short: "USF", city: "Tampa", state: "FL", colors: ["#006747", "#CFC493"] },
  { name: "Florida International University", short: "FIU", city: "Miami", state: "FL", colors: ["#081E3F", "#B6862C"] },
  { name: "Florida Atlantic University", short: "FAU", city: "Boca Raton", state: "FL", colors: ["#003366", "#CC0000"] },
  { name: "University of Alabama at Birmingham", short: "UAB", city: "Birmingham", state: "AL", colors: ["#1E6B52", "#F4C300"] },
  { name: "Tulane University", short: "Tulane", city: "New Orleans", state: "LA", colors: ["#006747", "#71C5E8"] },
  { name: "Louisiana Tech University", short: "Louisiana Tech", city: "Ruston", state: "LA", colors: ["#002F8B", "#E31837"] },
  { name: "University of Memphis", short: "Memphis", city: "Memphis", state: "TN", colors: ["#003087", "#898D8D"] },
  { name: "East Carolina University", short: "ECU", city: "Greenville", state: "NC", colors: ["#592A8A", "#FDC82F"] },
  { name: "Appalachian State University", short: "App State", city: "Boone", state: "NC", colors: ["#000000", "#FFB81C"] },
  { name: "University of North Carolina at Charlotte", short: "Charlotte", city: "Charlotte", state: "NC", colors: ["#005035", "#A49665"] },
  { name: "Coastal Carolina University", short: "Coastal Carolina", city: "Conway", state: "SC", colors: ["#006F71", "#A27752"] },
  { name: "Furman University", short: "Furman", city: "Greenville", state: "SC", colors: ["#582C83", "#E9A100"] },
  { name: "Mercer University", short: "Mercer", city: "Macon", state: "GA", colors: ["#F76900", "#000000"] },
  { name: "Georgia Southern University", short: "Georgia Southern", city: "Statesboro", state: "GA", colors: ["#011E41", "#87714D"] },
  { name: "Kennesaw State University", short: "Kennesaw State", city: "Kennesaw", state: "GA", colors: ["#FDB913", "#231F20"] },
  { name: "James Madison University", short: "JMU", city: "Harrisonburg", state: "VA", colors: ["#450084", "#CBB677"] },
  { name: "Old Dominion University", short: "ODU", city: "Norfolk", state: "VA", colors: ["#003057", "#7C878E"] },
  { name: "Virginia Commonwealth University", short: "VCU", city: "Richmond", state: "VA", colors: ["#000000", "#F8B300"] },
  { name: "Western Kentucky University", short: "Western Kentucky", city: "Bowling Green", state: "KY", colors: ["#C8102E", "#000000"] },

  // ── Midwest (remaining) ──────────────────────────────────────────────
  { name: "Ball State University", short: "Ball State", city: "Muncie", state: "IN", colors: ["#BA0C2F", "#FFFFFF"] },
  { name: "Butler University", short: "Butler", city: "Indianapolis", state: "IN", colors: ["#13294B", "#0072CE"] },
  { name: "Miami University", short: "Miami (OH)", city: "Oxford", state: "OH", colors: ["#B61E2E", "#FFFFFF"] },
  { name: "Ohio University", short: "Ohio", city: "Athens", state: "OH", colors: ["#00694E", "#CDA077"] },
  { name: "Kent State University", short: "Kent State", city: "Kent", state: "OH", colors: ["#002664", "#EAAB00"] },
  { name: "Bowling Green State University", short: "Bowling Green", city: "Bowling Green", state: "OH", colors: ["#FE5000", "#4F2C1D"] },
  { name: "University of Dayton", short: "Dayton", city: "Dayton", state: "OH", colors: ["#CE1141", "#004B8D"] },
  { name: "Marquette University", short: "Marquette", city: "Milwaukee", state: "WI", colors: ["#003366", "#FFCC00"] },
  { name: "University of Wisconsin-Milwaukee", short: "UW-Milwaukee", city: "Milwaukee", state: "WI", colors: ["#000000", "#FFC72C"] },
  { name: "DePaul University", short: "DePaul", city: "Chicago", state: "IL", colors: ["#003DA5", "#C8102E"] },
  { name: "Loyola University Chicago", short: "Loyola Chicago", city: "Chicago", state: "IL", colors: ["#7A0019", "#FFB81C"] },
  { name: "University of Illinois Chicago", short: "UIC", city: "Chicago", state: "IL", colors: ["#D50032", "#001E62"] },
  { name: "Illinois State University", short: "Illinois State", city: "Normal", state: "IL", colors: ["#CE0E2D", "#FFFFFF"] },
  { name: "Southern Illinois University", short: "SIU", city: "Carbondale", state: "IL", colors: ["#660000", "#751D24"] },
  { name: "University of Missouri-Kansas City", short: "UMKC", city: "Kansas City", state: "MO", colors: ["#005CB9", "#FFC425"] },
  { name: "Saint Louis University", short: "SLU", city: "St. Louis", state: "MO", colors: ["#003DA5", "#FFFFFF"] },
  { name: "Missouri State University", short: "Missouri State", city: "Springfield", state: "MO", colors: ["#5E0009", "#FFFFFF"] },
  { name: "Wichita State University", short: "Wichita State", city: "Wichita", state: "KS", colors: ["#FFC82E", "#000000"] },
  { name: "University of North Dakota", short: "North Dakota", city: "Grand Forks", state: "ND", colors: ["#009A44", "#000000"] },
  { name: "North Dakota State University", short: "NDSU", city: "Fargo", state: "ND", colors: ["#005643", "#FFC82E"] },
  { name: "University of South Dakota", short: "South Dakota", city: "Vermillion", state: "SD", colors: ["#CC0000", "#000000"] },
  { name: "Creighton University", short: "Creighton", city: "Omaha", state: "NE", colors: ["#002D72", "#005CA9"] },
  { name: "Drake University", short: "Drake", city: "Des Moines", state: "IA", colors: ["#004477", "#C9C9C9"] },

  // ── Texas / South Central (remaining) ────────────────────────────────
  { name: "University of North Texas", short: "North Texas", city: "Denton", state: "TX", colors: ["#00853E", "#000000"] },
  { name: "Texas State University", short: "Texas State", city: "San Marcos", state: "TX", colors: ["#501214", "#665E5A"] },
  { name: "University of Texas at Dallas", short: "UT Dallas", city: "Richardson", state: "TX", colors: ["#E87500", "#154734"] },
  { name: "University of Texas at Arlington", short: "UT Arlington", city: "Arlington", state: "TX", colors: ["#0064B1", "#F58025"] },
  { name: "University of Texas at San Antonio", short: "UTSA", city: "San Antonio", state: "TX", colors: ["#0C2340", "#F15A22"] },
  { name: "Texas A&M University-Corpus Christi", short: "TAMUCC", city: "Corpus Christi", state: "TX", colors: ["#0067C5", "#00843D"] },
  { name: "University of Oklahoma", short: "Oklahoma", city: "Norman", state: "OK", colors: ["#841617", "#FDF9D8"] },
  { name: "University of Tulsa", short: "Tulsa", city: "Tulsa", state: "OK", colors: ["#002D72", "#C5B783"] },
  { name: "University of Arkansas at Little Rock", short: "UALR", city: "Little Rock", state: "AR", colors: ["#76232F", "#9EA2A2"] },

  // ── Mountain West / West (remaining) ─────────────────────────────────
  { name: "Colorado State University", short: "Colorado State", city: "Fort Collins", state: "CO", colors: ["#1E4D2B", "#C8C372"] },
  { name: "University of Denver", short: "Denver", city: "Denver", state: "CO", colors: ["#864A98", "#C8102E"] },
  { name: "University of Wyoming", short: "Wyoming", city: "Laramie", state: "WY", colors: ["#492F24", "#FFC425"] },
  { name: "University of Montana", short: "Montana", city: "Missoula", state: "MT", colors: ["#5E0009", "#A2AAAD"] },
  { name: "Montana State University", short: "Montana State", city: "Bozeman", state: "MT", colors: ["#00205B", "#A2AAAD"] },
  { name: "Utah State University", short: "Utah State", city: "Logan", state: "UT", colors: ["#00263A", "#8A8D8F"] },
  { name: "University of Idaho", short: "Idaho", city: "Moscow", state: "ID", colors: ["#000000", "#F1B300"] },
  { name: "Arizona State University - Polytechnic", short: "ASU Poly", city: "Mesa", state: "AZ", colors: ["#8C1D40", "#FFC627"] },
  { name: "Northern Arizona University", short: "NAU", city: "Flagstaff", state: "AZ", colors: ["#003466", "#FFC72C"] },
  { name: "California State University, Long Beach", short: "Long Beach State", city: "Long Beach", state: "CA", colors: ["#000000", "#FFC72C"] },
  { name: "California State University, Fullerton", short: "Cal State Fullerton", city: "Fullerton", state: "CA", colors: ["#00244E", "#FF7900"] },
  { name: "Loyola Marymount University", short: "LMU", city: "Los Angeles", state: "CA", colors: ["#8A1538", "#00558C"] },
  { name: "University of San Diego", short: "San Diego", city: "San Diego", state: "CA", colors: ["#003B70", "#75B2DD"] },
  { name: "Santa Clara University", short: "Santa Clara", city: "Santa Clara", state: "CA", colors: ["#862633", "#FFFFFF"] },
  { name: "University of the Pacific", short: "Pacific", city: "Stockton", state: "CA", colors: ["#FF7300", "#000000"] },
  { name: "Pepperdine University", short: "Pepperdine", city: "Malibu", state: "CA", colors: ["#00205B", "#F5821F"] },
  { name: "University of San Francisco", short: "USF (CA)", city: "San Francisco", state: "CA", colors: ["#00543C", "#FDBB30"] },
  { name: "Sacramento State", short: "Sacramento State", city: "Sacramento", state: "CA", colors: ["#00563F", "#C4B581"] },
  { name: "Fresno State", short: "Fresno State", city: "Fresno", state: "CA", colors: ["#C41230", "#003594"] },

  // ── Notable additional privates / regionals ──────────────────────────
  { name: "Emory University", short: "Emory", city: "Atlanta", state: "GA", colors: ["#012169", "#F2A900"] },
  { name: "Rice University", short: "Rice", city: "Houston", state: "TX", colors: ["#00205B", "#7C7E7F"] },
  { name: "Washington University in St. Louis", short: "WashU", city: "St. Louis", state: "MO", colors: ["#A51417", "#007377"] },
  { name: "University of Chicago", short: "UChicago", city: "Chicago", state: "IL", colors: ["#800000", "#767676"] },
  { name: "Carnegie Mellon University", short: "CMU", city: "Pittsburgh", state: "PA", colors: ["#C41230", "#000000"] },
  { name: "Lehigh University", short: "Lehigh", city: "Bethlehem", state: "PA", colors: ["#653819", "#A89968"] },
  { name: "Bucknell University", short: "Bucknell", city: "Lewisburg", state: "PA", colors: ["#003865", "#E87722"] },
  { name: "Lafayette College", short: "Lafayette", city: "Easton", state: "PA", colors: ["#640817", "#000000"] },
  { name: "Gettysburg College", short: "Gettysburg", city: "Gettysburg", state: "PA", colors: ["#F47B20", "#000000"] },
  { name: "DePauw University", short: "DePauw", city: "Greencastle", state: "IN", colors: ["#000000", "#B5A268"] },
  { name: "Wabash College", short: "Wabash", city: "Crawfordsville", state: "IN", colors: ["#990000", "#FFFFFF"] },
  { name: "Elon University", short: "Elon", city: "Elon", state: "NC", colors: ["#73000A", "#B59A57"] },
  { name: "High Point University", short: "High Point", city: "High Point", state: "NC", colors: ["#3D0B5E", "#A2AAAD"] },
  { name: "Davidson College", short: "Davidson", city: "Davidson", state: "NC", colors: ["#000000", "#CE1126"] },
  { name: "College of Charleston", short: "Charleston", city: "Charleston", state: "SC", colors: ["#660000", "#9D8B5F"] },
  { name: "Auburn University at Montgomery", short: "AUM", city: "Montgomery", state: "AL", colors: ["#003B5C", "#E87722"] },
  { name: "Samford University", short: "Samford", city: "Birmingham", state: "AL", colors: ["#1A3A6B", "#C8102E"] },
  { name: "Rollins College", short: "Rollins", city: "Winter Park", state: "FL", colors: ["#00205B", "#FFB81C"] },
  { name: "Stetson University", short: "Stetson", city: "DeLand", state: "FL", colors: ["#005A43", "#FFFFFF"] },
  { name: "Texas A&M University-Commerce", short: "A&M-Commerce", city: "Commerce", state: "TX", colors: ["#003C71", "#FFB81C"] },
  { name: "Chapman University", short: "Chapman", city: "Orange", state: "CA", colors: ["#A50034", "#0C2340"] },
  { name: "University of Tampa", short: "Tampa", city: "Tampa", state: "FL", colors: ["#D6001C", "#000000"] },
  { name: "Quinnipiac University", short: "Quinnipiac", city: "Hamden", state: "CT", colors: ["#002D62", "#B58500"] },
  { name: "University of Hawaii at Manoa", short: "Hawaii", city: "Honolulu", state: "HI", colors: ["#024731", "#FFFFFF"] },
  { name: "University of Alaska Anchorage", short: "Alaska", city: "Anchorage", state: "AK", colors: ["#00583D", "#FFB81C"] },
  { name: "Marshall University", short: "Marshall", city: "Huntington", state: "WV", colors: ["#00B140", "#000000"] },
  { name: "University of Maine", short: "Maine", city: "Orono", state: "ME", colors: ["#003263", "#B0D7FF"] },
];

/** Normalize a string for accent-insensitive, case-insensitive matching. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .trim();
}

/**
 * Case-insensitive ranked search over the school catalog. Matches on the full
 * name, the short name, the city, and the two-letter state code.
 *
 * Ranking (lower score = better, surfaces first):
 *   0 — short name starts with the query (e.g. "ala" → "Alabama")
 *   1 — full name starts with the query
 *   2 — exact state-code match (e.g. "tx")
 *   3 — short name contains the query
 *   4 — full name contains the query
 *   5 — city contains the query
 * Ties break alphabetically by full name.
 *
 * @param q     raw user query (trimmed/normalized internally)
 * @param limit max results to return (default 8)
 */
export function searchSchools(q: string, limit = 8): School[] {
  const query = norm(q);
  if (!query) {
    // Empty query → a stable, useful default: the first `limit` schools, which
    // are the marquee Greek-heavy flagships at the top of the list.
    return SCHOOLS.slice(0, limit);
  }

  const scored: { school: School; score: number }[] = [];
  for (const school of SCHOOLS) {
    const name = norm(school.name);
    const short = norm(school.short);
    const city = norm(school.city);
    const state = norm(school.state);

    let score = Infinity;
    if (short.startsWith(query)) score = Math.min(score, 0);
    if (name.startsWith(query)) score = Math.min(score, 1);
    if (state === query) score = Math.min(score, 2);
    if (short.includes(query)) score = Math.min(score, 3);
    if (name.includes(query)) score = Math.min(score, 4);
    if (city.includes(query)) score = Math.min(score, 5);

    if (score !== Infinity) scored.push({ school, score });
  }

  scored.sort((a, b) =>
    a.score !== b.score ? a.score - b.score : a.school.name.localeCompare(b.school.name)
  );

  return scored.slice(0, limit).map((s) => s.school);
}
