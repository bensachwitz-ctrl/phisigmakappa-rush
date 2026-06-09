"use client";

import React, { useState, useEffect } from "react";
import {
  School,
  Search,
  User,
  Users,
  Lock,
  Bell,
  Calendar,
  DollarSign,
  CreditCard,
  Settings,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  Pin,
  Check,
  X,
  Info,
  Sparkles,
  MapPin,
  Award,
  Clock,
  Heart,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  Globe,
  ThumbsUp,
  MessageSquare,
  Crown,
  KeyRound,
  Trash2,
  ArrowLeft,
  XCircle,
  Key,
  Car
} from "lucide-react";

interface Tenant {
  id: string;
  subdomain: string;
  name: string | null;
  school: string | null;
  isActive: boolean;
  brandId?: string;
}

interface MobileAppClientProps {
  initialTenants: Tenant[];
}

export interface FraternityBrand {
  id: string;
  name: string;
  letters: string;
  primaryColor: string;
  primaryHover: string;
  textColor: string;
  accentBg: string;
  accentBorder: string;
  crestEmoji: string;
}

export const FRATERNITY_BRANDS: FraternityBrand[] = [
  {
    id: "phi-sig",
    name: "Phi Sigma Kappa",
    letters: "ΦΣΚ",
    primaryColor: "#C8102E", // Cardinal Red
    primaryHover: "#A00D24",
    textColor: "text-red-600",
    accentBg: "bg-red-50",
    accentBorder: "border-red-100",
    crestEmoji: "🛡️"
  },
  {
    id: "sig-chi",
    name: "Sigma Chi",
    letters: "ΣΧ",
    primaryColor: "#0056B3", // Blue
    primaryHover: "#003F85",
    textColor: "text-blue-600",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-100",
    crestEmoji: "🌟"
  },
  {
    id: "kap-sig",
    name: "Kappa Sigma",
    letters: "ΚΣ",
    primaryColor: "#00875A", // Emerald Green
    primaryHover: "#006644",
    textColor: "text-emerald-600",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-100",
    crestEmoji: "🔑"
  },
  {
    id: "ato",
    name: "Alpha Tau Omega",
    letters: "ΑΤΩ",
    primaryColor: "#0077C8", // Azure Blue
    primaryHover: "#005994",
    textColor: "text-sky-600",
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-100",
    crestEmoji: "⚓"
  },
  {
    id: "sae",
    name: "Sigma Alpha Epsilon",
    letters: "ΣΑΕ",
    primaryColor: "#512888", // Royal Purple
    primaryHover: "#3E1F68",
    textColor: "text-purple-600",
    accentBg: "bg-purple-50",
    accentBorder: "border-purple-100",
    crestEmoji: "🦁"
  },
  {
    id: "beta",
    name: "Beta Theta Pi",
    letters: "ΒΘΠ",
    primaryColor: "#1A82E2", // Sky Blue
    primaryHover: "#1267B7",
    textColor: "text-sky-500",
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-100",
    crestEmoji: "🐉"
  }
];

const DEMO_TENANTS: Tenant[] = [
  { id: "demo-psk", subdomain: "psk", name: "Phi Sigma Kappa", school: "University of South Carolina", isActive: true, brandId: "phi-sig" },
  { id: "demo-sigchi", subdomain: "sigchi", name: "Sigma Chi", school: "University of South Carolina", isActive: true, brandId: "sig-chi" },
  { id: "demo-kapsig", subdomain: "kapsig", name: "Kappa Sigma", school: "University of South Carolina", isActive: true, brandId: "kap-sig" },
  { id: "demo-ato", subdomain: "ato", name: "Alpha Tau Omega", school: "University of South Carolina", isActive: true, brandId: "ato" },
  { id: "demo-sae", subdomain: "sae", name: "Sigma Alpha Epsilon", school: "University of South Carolina", isActive: true, brandId: "sae" },
  { id: "demo-beta", subdomain: "beta", name: "Beta Theta Pi", school: "University of South Carolina", isActive: true, brandId: "beta" },
];

/**
 * Per-tab explainer copy for the interactive demo tour. As a visitor taps
 * through the bottom tabs, a small dismissible callout surfaces inside the phone
 * describing exactly what that tool does for a real chapter — so the demo isn't
 * just a pretty mockup, it teaches the product feature-by-feature.
 */
const DEMO_CALLOUTS: Record<
  "feed" | "events" | "rush" | "dues" | "directory" | "settings",
  { title: string; body: string }
> = {
  feed: {
    title: "Chapter feed",
    body: "Officers broadcast announcements here — pinned when it matters. Every member sees the latest chapter news on their dashboard instead of digging through a group chat.",
  },
  events: {
    title: "Events & calendar",
    body: "Meetings, socials, and service events with RSVP and one-tap roster check-in. Members add any event to their personal Google / iCloud calendar in a tap.",
  },
  rush: {
    title: "Recruitment pipeline",
    body: "Run your whole rush from one board: QR check-in builds the PNM list, brothers vote anonymously, and rushees get TCPA-compliant texts — no spreadsheet, no five group chats.",
  },
  dues: {
    title: "Dues & payments",
    body: "Members pay by card via Stripe; money lands straight in your chapter's account and the ledger reconciles itself. Payment plans and reminders run on their own.",
  },
  directory: {
    title: "Roster & alumni network",
    body: "A searchable directory of actives and alumni by class year — plus gated alumni onboarding and Stripe giving flows that turn graduated brothers into a recurring base.",
  },
  settings: {
    title: "Your profile",
    body: "Each member manages their own profile, privacy, and notifications. Officers get role-scoped access so everyone sees exactly their job — nothing more.",
  },
};

function getMockDemoData(tenant: Tenant, brand: FraternityBrand) {
  return {
    chapter: {
      subdomain: tenant.subdomain,
      name: `${brand.name} (${brand.letters})`,
      schoolName: tenant.school || "University of South Carolina",
    },
    role: "brother",
    profile: {
      id: "demo-brother-id",
      name: "Alex Mercer",
      email: `alex.mercer@${tenant.subdomain}.edu`,
      phone: "803-555-0144",
      year: "Senior",
      major: "Computer Science",
      position: "President",
      pledgeClass: "Alpha Chi",
      hometown: "Charleston, SC",
      gradYear: "2026",
      status: "ACTIVE",
      duesPaid: false,
    },
    standing: {
      score: 92,
      max: 100,
      pct: 92,
      standing: "GOOD",
      breakdown: [
        { label: "Attendance", pct: 95 },
        { label: "Service Hours", pct: 100 },
        { label: "Dues Status", pct: 0 },
      ]
    },
    dues: {
      config: {
        enabled: true,
        amountCents: 150000,
        year: "2026-fall",
        label: "Active Brother Dues",
        stripePublishableKey: "pk_test_1234",
      },
      payments: [],
      isPaid: false,
    },
    announcements: [
      {
        id: "a1",
        title: "Chapter Meeting Sunday at 7 PM",
        body: "We will be discussing fall rush preparation and voting on the new budget. Attendance is mandatory for all active brothers. Location: Chapter Room.",
        pinned: true,
        createdAt: new Date().toISOString(),
        authorName: "Alex Mercer",
        authorRole: "President",
      },
      {
        id: "a2",
        title: "Community Service Day - Saturday",
        body: "Join us at the local Special Olympics center starting at 9 AM. Wear chapter letters. We need at least 15 brothers to hit our required semester hours.",
        pinned: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        authorName: "Jack Snyder",
        authorRole: "Philanthropy Chair",
      },
    ],
    events: [
      {
        id: "e1",
        name: "Fall Info Session & Coffee",
        description: "First open rush event. Come meet prospective members and share coffee.",
        location: "Russell House Union",
        dressCode: "Casual / Letters",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: null,
        category: "RUSH",
        myRsvp: null,
      },
      {
        id: "e2",
        name: "Formal Chapter Meeting",
        description: "Ritual meeting. Active members only. Budget vote.",
        location: "Chapter Room",
        dressCode: "Formal (Suit & Tie)",
        startsAt: new Date(Date.now() + 172800000).toISOString(),
        endsAt: null,
        category: "CHAPTER",
        myRsvp: { status: "GOING" },
      },
    ],
    roster: {
      actives: [
        {
          id: "demo-brother-id",
          name: "Alex Mercer",
          email: `alex.mercer@${tenant.subdomain}.edu`,
          phone: "803-555-0144",
          year: "Senior",
          major: "Computer Science",
          position: "President",
          pledgeClass: "Alpha Chi",
          headshotUrl: null,
          status: "ACTIVE",
        },
        {
          id: "b2",
          name: "Jack Snyder",
          email: `jack.s@${tenant.subdomain}.edu`,
          phone: "803-555-0291",
          year: "Junior",
          major: "Finance",
          position: "Treasurer",
          pledgeClass: "Beta Alpha",
          headshotUrl: null,
          status: "ACTIVE",
        },
      ],
      alumni: [
        {
          id: "al1",
          name: "Marcus Brody",
          preferredName: "Marc",
          graduationYear: 2020,
          pledgeClass: "Upsilon",
          email: "marcus.brody@google.com",
          phone: "415-555-0921",
          city: "San Francisco",
          state: "CA",
          employer: "Google",
          jobTitle: "Software Engineer Senior",
          linkedinUrl: "https://linkedin.com",
          bio: "Always happy to help younger brothers review resumes and talk tech.",
        },
        {
          id: "al2",
          name: "David Vance",
          preferredName: "Dave",
          graduationYear: 2018,
          pledgeClass: "Sigma",
          email: "d.vance@goldmansachs.com",
          phone: "212-555-0811",
          city: "New York",
          state: "NY",
          employer: "Goldman Sachs",
          jobTitle: "Investment Banking Associate",
          linkedinUrl: "https://linkedin.com",
          bio: "Reach out if you are interested in finance internships or analyst opportunities.",
        },
      ],
    },
    careers: [
      {
        id: "c1",
        title: "Software Engineering Intern (Fall 2026)",
        company: "Google",
        location: "San Francisco, CA (Hybrid)",
        description: "We are looking for a software engineering intern to join our Google Search infrastructure team. You will work on scalable backend APIs using Go/C++ and learn real-world optimization.",
        requirements: "Prior experience with algorithms, data structures, and at least one backend language. Class of 2027 or 2028 preferred.",
        contactName: "Marcus Brody",
        contactEmail: "marcus.brody@google.com",
        contactPhone: "415-555-0921",
        salary: "$45/hr",
        postedById: "al1",
        postedByName: "Marcus Brody",
        postedByRole: "alumni",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: "c2",
        title: "Investment Banking Analyst",
        company: "Goldman Sachs",
        location: "New York, NY",
        description: "Full-time investment banking analyst role. Looking for seniors or recent grads with strong financial modeling skills to join our FIG coverage group.",
        requirements: "Finance, Economics, or math background. Excel modeling knowledge is a plus.",
        contactName: "David Vance",
        contactEmail: "d.vance@goldmansachs.com",
        contactPhone: "212-555-0811",
        salary: "$110,000/yr",
        postedById: "al2",
        postedByName: "David Vance",
        postedByRole: "alumni",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    pnms: [
      {
        id: "pnm1",
        name: "John Doe",
        email: "john.doe@gmail.com",
        phone: "803-555-0199",
        hometown: "Charleston, SC",
        major: "Finance",
        year: "Freshman",
        highSchoolInfo: "Wando High School",
        backgroundInfo: "High school varsity soccer captain. Interested in business/finance track.",
        linkedinUrl: "https://linkedin.com",
        status: "ACTIVE",
        votesCount: 4,
        votesAverage: 1.5,
        myVote: null,
        impressions: [
          { authorName: "Jack Snyder", tone: "positive", note: "Met him at the info session. Super outgoing and easy to talk to." }
        ],
        attendanceCount: 1
      },
      {
        id: "pnm2",
        name: "Sarah Jenkins",
        email: "sarah.j@outlook.com",
        phone: "803-555-0211",
        hometown: "Columbia, SC",
        major: "Biology",
        year: "Sophomore",
        highSchoolInfo: "Spring Valley High",
        backgroundInfo: "Pre-med track. Volunteered at local hospitals. Sister is an alumna of Delta Delta Delta.",
        linkedinUrl: "",
        status: "ACTIVE",
        votesCount: 3,
        votesAverage: 0.67,
        myVote: null,
        impressions: [
          { authorName: "Alex Mercer", tone: "neutral", note: "Intelligent and polite, but seemed slightly reserved." }
        ],
        attendanceCount: 2
      },
      {
        id: "pnm3",
        name: "Michael Chang",
        email: "mchang@gmail.com",
        phone: "803-555-0155",
        hometown: "Greenville, SC",
        major: "Mechanical Engineering",
        year: "Freshman",
        highSchoolInfo: "Greenville Tech Charter",
        backgroundInfo: "Interested in robotics and engineering club. GPA is 4.0.",
        linkedinUrl: "https://linkedin.com",
        status: "BID_EXTENDED",
        votesCount: 8,
        votesAverage: 1.88,
        myVote: 1,
        impressions: [
          { authorName: "Jack Snyder", tone: "positive", note: "Absolutely solid guy. Smart, humble, and really fits the chapter." },
          { authorName: "Alex Mercer", tone: "positive", note: "Very impressed by his drive. Extending a bid is a no-brainer." }
        ],
        attendanceCount: 2
      },
      {
        id: "pnm4",
        name: "David Smith",
        email: "dsmith@gmail.com",
        phone: "803-555-0322",
        hometown: "Atlanta, GA",
        major: "Marketing",
        year: "Freshman",
        highSchoolInfo: "Lakeside High School",
        backgroundInfo: "Loves golf and outdoor sports. Father is an alumnus.",
        linkedinUrl: "",
        status: "ACTIVE",
        votesCount: 2,
        votesAverage: -0.5,
        myVote: null,
        impressions: [
          { authorName: "Jack Snyder", tone: "concern", note: "Showed up late to the house tour and seemed a bit inattentive." }
        ],
        attendanceCount: 1
      }
    ]
  };
}

export function WebGLBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vsSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      varying lowp vec4 vColor;
      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        gl_PointSize = 4.5;
        vColor = aColor;
      }
    `;

    const fsSource = `
      varying lowp vec4 vColor;
      void main(void) {
        gl_FragColor = vColor;
      }
    `;

    function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return;
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error("Shader linking error");
      return;
    }

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aPosition"),
        vertexColor: gl.getAttribLocation(shaderProgram, "aColor"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      },
    };

    const numParticles = 90;
    const positions: number[] = [];
    const colors: number[] = [];
    const velocities: number[] = [];

    for (let i = 0; i < numParticles; i++) {
      positions.push(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
      colors.push(
        0.35 + Math.random() * 0.15,
        0.45 + Math.random() * 0.2,
        0.85 + Math.random() * 0.15,
        0.12 + Math.random() * 0.18
      );
      velocities.push(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      );
    }

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    const linePosBuffer = gl.createBuffer();
    const lineColorBuffer = gl.createBuffer();

    const fieldOfView = (45 * Math.PI) / 180;
    const zNear = 0.1;
    const zFar = 100.0;

    function makePerspectiveMatrix(fov: number, aspect: number, near: number, far: number) {
      const f = 1.0 / Math.tan(fov / 2);
      const rangeInv = 1.0 / (near - far);
      return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
      ];
    }

    function makeIdentityMatrix() {
      return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
    }

    function rotateMatrixY(m: number[], angle: number) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const r = [...m];
      r[0] = m[0] * c + m[8] * s;
      r[2] = m[2] * c + m[10] * s;
      r[8] = m[0] * -s + m[8] * c;
      r[10] = m[2] * -s + m[10] * c;
      return r;
    }

    function rotateMatrixX(m: number[], angle: number) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const r = [...m];
      r[5] = m[5] * c + m[9] * -s;
      r[6] = m[6] * c + m[10] * -s;
      r[9] = m[5] * s + m[9] * c;
      r[10] = m[6] * s + m[10] * c;
      return r;
    }

    let rotationY = 0;
    let rotationX = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("mousemove", handleMouseMoveGlobal);

    let animationFrameId: number;

    function render() {
      if (!canvas || !gl) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = width / height;
      const projectionMatrix = makePerspectiveMatrix(fieldOfView, aspect, zNear, zFar);

      for (let i = 0; i < numParticles; i++) {
        const idx = i * 3;
        positions[idx] += velocities[idx];
        positions[idx + 1] += velocities[idx + 1];
        positions[idx + 2] += velocities[idx + 2];

        if (Math.abs(positions[idx]) > 2.8) velocities[idx] *= -1;
        if (Math.abs(positions[idx + 1]) > 2.8) velocities[idx + 1] *= -1;
        if (Math.abs(positions[idx + 2]) > 2.8) velocities[idx + 2] *= -1;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

      let modelViewMatrix = makeIdentityMatrix();
      modelViewMatrix[14] = -6.5;

      rotationY += 0.0008;
      const currentRotY = rotationY + mouseX;
      const currentRotX = rotationX + mouseY;

      modelViewMatrix = rotateMatrixY(modelViewMatrix, currentRotY);
      modelViewMatrix = rotateMatrixX(modelViewMatrix, currentRotX);

      gl.useProgram(programInfo.program);

      gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, new Float32Array(projectionMatrix));
      gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, new Float32Array(modelViewMatrix));

      gl.drawArrays(gl.POINTS, 0, numParticles);

      const linePositions: number[] = [];
      const lineColors: number[] = [];
      const threshold = 1.0;

      for (let i = 0; i < numParticles; i++) {
        const p1x = positions[i * 3];
        const p1y = positions[i * 3 + 1];
        const p1z = positions[i * 3 + 2];

        for (let j = i + 1; j < numParticles; j++) {
          const p2x = positions[j * 3];
          const p2y = positions[j * 3 + 1];
          const p2z = positions[j * 3 + 2];

          const dx = p1x - p2x;
          const dy = p1y - p2y;
          const dz = p1z - p2z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < threshold) {
            linePositions.push(p1x, p1y, p1z, p2x, p2y, p2z);
            const opacity = (1.0 - dist / threshold) * 0.1;
            lineColors.push(
              0.4, 0.5, 0.9, opacity,
              0.4, 0.5, 0.9, opacity
            );
          }
        }
      }

      if (linePositions.length > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, linePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(linePositions), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, lineColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineColors), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

        gl.drawArrays(gl.LINES, 0, linePositions.length / 3);
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMoveGlobal);
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteBuffer(linePosBuffer);
      gl.deleteBuffer(lineColorBuffer);
      gl.deleteProgram(shaderProgram);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

export default function MobileAppClient({ initialTenants }: MobileAppClientProps) {
  const [tenants] = useState<Tenant[]>(initialTenants);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<FraternityBrand>(FRATERNITY_BRANDS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState<"brother" | "alumni">("brother");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Demo Side Panel Modals & States
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  // Forgot password mobile states
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 3D Perspective Tilt & Glare States
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHoveringPhone, setIsHoveringPhone] = useState(false);

  // Sober Driving & New Member Simulator States
  const [isRushActive, setIsRushActive] = useState(true);
  const [simulatedDay, setSimulatedDay] = useState<"Friday" | "Saturday" | "Other">("Friday");
  const [simulatedHour, setSimulatedHour] = useState<number>(23); // 11 PM
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "schedule">("directory");
  const [soberAssignments, setSoberAssignments] = useState<Record<string, string>>({
    "Friday-22": "pnm3", // Michael Chang (Friday 10pm-12am)
    "Friday-00": "pnm1", // John Doe (Friday 12am-2am)
    "Saturday-22": "pnm2", // Sarah Jenkins (Saturday 10pm-12am)
    "Saturday-00": "pnm4", // David Smith (Saturday 12am-2am)
  });

  const handlePhoneMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 8;
    const rX = ((centerY - y) / centerY) * maxTilt;
    const rY = ((x - centerX) / centerX) * maxTilt;
    setRotateX(rX);
    setRotateY(rY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handlePhoneMouseEnter = () => {
    setIsHoveringPhone(true);
  };

  const handlePhoneMouseLeave = () => {
    setIsHoveringPhone(false);
    setRotateX(0);
    setRotateY(0);
  };
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Presidential Admin Console states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"actives" | "alumni">("actives");
  const [newMemberPosition, setNewMemberPosition] = useState("");
  const [newMemberGradYear, setNewMemberGradYear] = useState(new Date().getFullYear().toString());
  
  // Tab navigation states
  const [activeTab, setActiveTab] = useState<"feed" | "events" | "rush" | "dues" | "directory" | "settings">("feed");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Search & sub-tab filters
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterTab, setRosterTab] = useState<"actives" | "alumni" | "careers">("actives");
  const [rsvpSubmittingId, setRsvpSubmittingId] = useState<string | null>(null);

  // Rush tab states
  const [rushSearch, setRushSearch] = useState("");
  const [rushFilter, setRushFilter] = useState<"ALL" | "ACTIVE" | "BID_EXTENDED" | "DROPPED">("ALL");
  const [selectedPnm, setSelectedPnm] = useState<any | null>(null);
  const [newImpressionNote, setNewImpressionNote] = useState("");
  const [newImpressionTone, setNewImpressionTone] = useState<"positive" | "neutral" | "concern">("positive");
  const [userVoteInput, setUserVoteInput] = useState<number>(0);

  // Job posting form state
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobContactName, setJobContactName] = useState("");
  const [jobContactEmail, setJobContactEmail] = useState("");
  const [jobContactPhone, setJobContactPhone] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [postJobError, setPostJobError] = useState<string | null>(null);
  const [postJobSuccess, setPostJobSuccess] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Dynamic Custom Demo Features States
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [showPostAnnModal, setShowPostAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annPinned, setAnnPinned] = useState(false);
  const [postAnnSuccess, setPostAnnSuccess] = useState(false);
  const [jobCrossPost, setJobCrossPost] = useState(true);

  // ── Interactive demo callouts ────────────────────────────────────────────
  // In demo mode we float a small, dismissible "tour" text-box inside the phone
  // that explains the feature on the tab the visitor is currently viewing. It
  // re-appears (with fresh copy) whenever they switch tabs, so exploring the app
  // teaches them what each tool does. A separate "dismissed entirely" flag lets a
  // visitor turn the tour off for the rest of the session.
  const [calloutVisible, setCalloutVisible] = useState(true);
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  // Re-show the per-tab callout each time the active tab changes (unless the
  // visitor turned the tour off). Keyed on activeTab so each tab gets its tip.
  useEffect(() => {
    if (!calloutDismissed) setCalloutVisible(true);
  }, [activeTab, calloutDismissed]);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLinkedIn, setEditLinkedIn] = useState("");

  useEffect(() => {
    if (showEditProfileModal && dashboardData?.profile) {
      const p = dashboardData.profile;
      setEditPhone(p.phone || "");
      setEditHometown(p.hometown || "");
      setEditYear(p.year || "");
      setEditMajor(p.major || "");
      setEditCompany(p.employer || "");
      setEditJobTitle(p.jobTitle || "");
      setEditCity(p.city || "");
      setEditState(p.state || "");
      setEditBio(p.bio || "");
      setEditLinkedIn(p.linkedinUrl || "");
    }
  }, [showEditProfileModal, dashboardData]);

  // Combine real and demo chapters for picker
  const allChapters = React.useMemo(() => {
    const dbTenants = tenants.map(t => {
      // Deduce matching brand or fallback
      let bId = "phi-sig";
      const nameLower = (t.name || t.subdomain).toLowerCase();
      if (nameLower.includes("sigma chi")) bId = "sig-chi";
      else if (nameLower.includes("kappa sigma")) bId = "kap-sig";
      else if (nameLower.includes("alpha tau")) bId = "ato";
      else if (nameLower.includes("sae") || nameLower.includes("epsilon")) bId = "sae";
      else if (nameLower.includes("beta")) bId = "beta";
      return { ...t, brandId: bId };
    });
    // Remove database items that match demo subdomains to prevent duplicates
    const filteredDb = dbTenants.filter(t => !DEMO_TENANTS.some(dt => dt.subdomain === t.subdomain));
    return [...DEMO_TENANTS, ...filteredDb];
  }, [tenants]);

  // Load session or check URL params for ?demo=true onboarding bypass
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      const demoTenant = DEMO_TENANTS[0]; // Phi Sigma Kappa
      const brand = FRATERNITY_BRANDS[0];
      const demoUser = {
        id: "demo-user-id",
        email: "alex.mercer@sc.edu",
        role: "brother",
        brotherId: "demo-brother-id",
        subdomain: demoTenant.subdomain,
        chapterName: demoTenant.name,
        schoolName: demoTenant.school
      };
      
      setSelectedTenant(demoTenant);
      setSelectedBrand(brand);
      setToken("demo-token-12345");
      setUser(demoUser);
      setRole("brother");
      setIsDemo(true);
      setDashboardData(getMockDemoData(demoTenant, brand));
      setLoading(false);
      return;
    }

    const savedToken = localStorage.getItem("gs_mobile_token");
    const savedUser = localStorage.getItem("gs_mobile_user");
    const savedTenant = localStorage.getItem("gs_mobile_tenant");
    const savedBrand = localStorage.getItem("gs_mobile_brand");

    if (savedToken && savedUser && savedTenant) {
      try {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setRole(parsedUser.role);
        setSelectedTenant(JSON.parse(savedTenant));
        setIsDemo(parsedUser.id.startsWith("demo-") || parsedUser.brotherId?.startsWith("demo-") || parsedUser.alumniId?.startsWith("demo-"));
        if (savedBrand) {
          setSelectedBrand(JSON.parse(savedBrand));
        }
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // Fetch real portal data when authenticated in non-demo mode
  useEffect(() => {
    if (!token || !selectedTenant || isDemo) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mobile/data?subdomain=${selectedTenant.subdomain}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setDashboardData(data);
        } else {
          setError(data.error || "Failed to load chapter data.");
          if (res.status === 401) {
            handleSignOut();
          }
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, selectedTenant, isDemo]);

  // Handle tenant selection in picker
  const handleSelectTenant = (t: Tenant) => {
    const brand = FRATERNITY_BRANDS.find(b => b.id === t.brandId) || FRATERNITY_BRANDS[0];
    setSelectedTenant(t);
    setSelectedBrand(brand);
    
    // Auto-login logic for demo chapters to keep it fast
    if (t.id.startsWith("demo-")) {
      setIsDemo(true);
      setLoading(true);
      setTimeout(() => {
        const demoUser = {
          id: "demo-user-id",
          email: `alex.mercer@${t.subdomain}.edu`,
          role: "brother",
          brotherId: "demo-brother-id",
          subdomain: t.subdomain,
          chapterName: t.name,
          schoolName: t.school
        };
        setToken("demo-token-12345");
        setUser(demoUser);
        setRole("brother");
        setDashboardData(getMockDemoData(t, brand));
        
        localStorage.setItem("gs_mobile_token", "demo-token-12345");
        localStorage.setItem("gs_mobile_user", JSON.stringify(demoUser));
        localStorage.setItem("gs_mobile_tenant", JSON.stringify(t));
        localStorage.setItem("gs_mobile_brand", JSON.stringify(brand));
        
        setLoading(false);
      }, 300);
    } else {
      setIsDemo(false);
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setAuthLoading(true);
    setError(null);

    if (isDemo) {
      setTimeout(() => {
        const demoUser = {
          id: "demo-user-id",
          email: email || `user@${selectedTenant.subdomain}.edu`,
          role: role,
          brotherId: role === "brother" ? "demo-brother-id" : null,
          alumniId: role === "alumni" ? "demo-alumni-id" : null,
          subdomain: selectedTenant.subdomain,
          chapterName: selectedTenant.name,
          schoolName: selectedTenant.school
        };
        setToken("demo-token-12345");
        setUser(demoUser);
        setDashboardData(getMockDemoData(selectedTenant, selectedBrand));
        
        localStorage.setItem("gs_mobile_token", "demo-token-12345");
        localStorage.setItem("gs_mobile_user", JSON.stringify(demoUser));
        localStorage.setItem("gs_mobile_tenant", JSON.stringify(selectedTenant));
        localStorage.setItem("gs_mobile_brand", JSON.stringify(selectedBrand));
        
        setEmail("");
        setPassword("");
        setAuthLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await fetch("/api/mobile/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setToken(data.token);
        setUser(data.user);
        
        localStorage.setItem("gs_mobile_token", data.token);
        localStorage.setItem("gs_mobile_user", JSON.stringify(data.user));
        localStorage.setItem("gs_mobile_tenant", JSON.stringify(selectedTenant));
        localStorage.setItem("gs_mobile_brand", JSON.stringify(selectedBrand));
        
        setEmail("");
        setPassword("");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch (err) {
      setError("Server connection failed. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setSelectedTenant(null);
    setDashboardData(null);
    setError(null);
    setIsDemo(false);
    setActiveTab("feed");
    setRosterSearch("");
    setRushSearch("");
    setSelectedPnm(null);
  };

  const handleRsvp = async (eventId: string, status: "GOING" | "MAYBE" | "NOT_GOING") => {
    if (!selectedTenant || !token) return;

    if (isDemo) {
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const updatedEvents = prev.events.map((e: any) => {
          if (e.id === eventId) {
            return { ...e, myRsvp: { status } };
          }
          return e;
        });
        return { ...prev, events: updatedEvents };
      });
      return;
    }

    setRsvpSubmittingId(eventId);

    try {
      const res = await fetch("/api/mobile/events/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          eventId,
          status,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setDashboardData((prev: any) => {
          if (!prev) return prev;
          const updatedEvents = prev.events.map((e: any) => {
            if (e.id === eventId) {
              return { ...e, myRsvp: { status } };
            }
            return e;
          });
          return { ...prev, events: updatedEvents };
        });
      }
    } catch (err) {
      console.error("RSVP failed:", err);
    } finally {
      setRsvpSubmittingId(null);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !token) return;

    setPostJobError(null);
    setPostJobSuccess(false);

    const jobData = {
      title: jobTitle,
      company: jobCompany,
      location: jobLocation,
      salary: jobSalary,
      contactName: jobContactName,
      contactEmail: jobContactEmail,
      contactPhone: jobContactPhone,
      description: jobDescription,
      requirements: jobRequirements,
    };

    if (isDemo) {
      const mockJob = {
        id: `demo-job-${Date.now()}`,
        ...jobData,
        postedByName: user.name || "Alex Mercer",
        postedByRole: role,
        createdAt: new Date().toISOString(),
      };

      // Create a teaser announcement if cross-post is enabled
      const newAnnouncements = [...(dashboardData?.announcements || [])];
      if (jobCrossPost) {
        newAnnouncements.unshift({
          id: `demo-ann-job-${Date.now()}`,
          title: `Career Opp: ${jobTitle} at ${jobCompany}`,
          body: `${user.name || "Alex Mercer"} (${role === "alumni" ? "Alumnus" : "President"}) posted a new career opportunity: ${jobTitle} in ${jobLocation || "Remote"}. Qualification: ${jobRequirements || "None specified"}. Check details and apply in the Careers Directory!`,
          pinned: false,
          createdAt: new Date().toISOString(),
          authorName: user.name || "Alex Mercer",
          authorRole: role === "alumni" ? "Alumni" : "President",
        });
      }

      setDashboardData((prev: any) => ({
        ...prev,
        careers: [mockJob, ...(prev.careers || [])],
        announcements: newAnnouncements
      }));

      showToast("Job opportunity posted!", "success");
      setPostJobSuccess(true);
      resetJobForm();
      setTimeout(() => {
        setPostJobSuccess(false);
        setShowPostJobModal(false);
      }, 1000);
      return;
    }

    try {
      const res = await fetch("/api/mobile/career/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          ...jobData
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setDashboardData((prev: any) => ({
          ...prev,
          careers: [data.job, ...(prev.careers || [])]
        }));
        showToast("Job opportunity posted!", "success");
        setPostJobSuccess(true);
        resetJobForm();
        setTimeout(() => {
          setPostJobSuccess(false);
          setShowPostJobModal(false);
        }, 1000);
      } else {
        setPostJobError(data.error || "Failed to post job listing.");
      }
    } catch (err) {
      setPostJobError("Network error. Please try again.");
    }
  };

  const resetJobForm = () => {
    setJobTitle("");
    setJobCompany("");
    setJobLocation("");
    setJobSalary("");
    setJobContactName("");
    setJobContactEmail("");
    setJobContactPhone("");
    setJobDescription("");
    setJobRequirements("");
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;

    const mockAnn = {
      id: `demo-ann-${Date.now()}`,
      title: annTitle.trim(),
      body: annBody.trim(),
      pinned: annPinned,
      createdAt: new Date().toISOString(),
      authorName: user.name || "Alex Mercer",
      authorRole: role === "alumni" ? "Alumni" : "President",
    };

    setDashboardData((prev: any) => {
      const updatedAnn = [mockAnn, ...(prev.announcements || [])];
      return {
        ...prev,
        announcements: updatedAnn
      };
    });

    setPostAnnSuccess(true);
    setAnnTitle("");
    setAnnBody("");
    setAnnPinned(false);
    showToast("Announcement published!", "success");
    setTimeout(() => {
      setPostAnnSuccess(false);
      setShowPostAnnModal(false);
    }, 1000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;

    const isAlum = role === "alumni";
    const updatedProfile = {
      ...dashboardData.profile,
      phone: editPhone,
      hometown: editHometown,
      year: editYear,
      major: editMajor,
      ...(isAlum ? {
        employer: editCompany,
        jobTitle: editJobTitle,
        city: editCity,
        state: editState,
        bio: editBio,
        linkedinUrl: editLinkedIn,
      } : {})
    };

    // Update in actives roster or alumni roster list so it is reflected in Directory instantly!
    let updatedRoster = { ...dashboardData.roster };
    if (!isAlum) {
      updatedRoster.actives = (updatedRoster.actives || []).map((b: any) => {
        if (b.id === dashboardData.profile.id) {
          return {
            ...b,
            phone: editPhone,
            year: editYear,
            major: editMajor,
          };
        }
        return b;
      });
    } else {
      updatedRoster.alumni = (updatedRoster.alumni || []).map((al: any) => {
        if (al.id === dashboardData.profile.id) {
          return {
            ...al,
            phone: editPhone,
            employer: editCompany,
            jobTitle: editJobTitle,
            city: editCity,
            state: editState,
            bio: editBio,
            linkedinUrl: editLinkedIn,
          };
        }
        return al;
      });
    }

    setDashboardData((prev: any) => ({
      ...prev,
      profile: updatedProfile,
      roster: updatedRoster,
    }));

    showToast("Profile updated successfully!", "success");
    setShowEditProfileModal(false);
  };

  // Simulated Stripe Payment process
  const handleSimulateStripePay = () => {
    showToast("Securing connection to Stripe Connect...", "info");
    setTimeout(() => {
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const newPayment = {
          id: `demo-pay-${Date.now()}`,
          amountCents: prev.dues?.config?.amountCents || 150000,
          year: prev.dues?.config?.year || "2026-fall",
          status: "PAID",
          method: "STRIPE",
          createdAt: new Date().toISOString(),
          notes: "Online Payment Settled via Stripe Passthrough"
        };
        return {
          ...prev,
          profile: { ...prev.profile, duesPaid: true },
          dues: {
            ...prev.dues,
            isPaid: true,
            payments: [newPayment, ...(prev.dues.payments || [])]
          }
        };
      });
      showToast("Payment Complete! Stripe Connect reconciled successfully.", "success");
    }, 1000);
  };

  // Vote on PNM in Rush tab (Simulation)
  const handlePnmVote = (pnmId: string, score: number) => {
    if (!isDemo) {
      showToast("Voting on PNMs is available in offline demo mode.", "info");
      return;
    }
    
    setDashboardData((prev: any) => {
      if (!prev || !prev.pnms) return prev;
      const updatedPnms = prev.pnms.map((p: any) => {
        if (p.id === pnmId) {
          const hadPrior = p.myVote !== null;
          const delta = score - (p.myVote || 0);
          const newVotesCount = p.votesCount + (hadPrior ? 0 : 1);
          const newVotesSum = (p.votesAverage * p.votesCount) + delta;
          const newAvg = parseFloat((newVotesSum / newVotesCount).toFixed(2));
          
          const updated = {
            ...p,
            myVote: score,
            votesCount: newVotesCount,
            votesAverage: newAvg
          };
          if (selectedPnm && selectedPnm.id === pnmId) {
            setSelectedPnm(updated);
          }
          return updated;
        }
        return p;
      });
      return { ...prev, pnms: updatedPnms };
    });
    showToast(`Vote (${score > 0 ? '+' : ''}${score}) registered successfully.`, "success");
  };

  // Add impression note on PNM (Simulation)
  const handleAddImpression = (e: React.FormEvent, pnmId: string) => {
    e.preventDefault();
    if (!newImpressionNote.trim()) return;

    if (!isDemo) {
      showToast("Adding impressions is supported in offline demo mode.", "info");
      return;
    }

    const newNote = {
      authorName: user.name || "Alex Mercer",
      tone: newImpressionTone,
      note: newImpressionNote.trim()
    };

    setDashboardData((prev: any) => {
      if (!prev || !prev.pnms) return prev;
      const updatedPnms = prev.pnms.map((p: any) => {
        if (p.id === pnmId) {
          const updated = {
            ...p,
            impressions: [...p.impressions, newNote]
          };
          if (selectedPnm && selectedPnm.id === pnmId) {
            setSelectedPnm(updated);
          }
          return updated;
        }
        return p;
      });
      return { ...prev, pnms: updatedPnms };
    });

    setNewImpressionNote("");
    showToast("Vibe note added to PNM card.", "success");
  };

  // Simulate Check-In door scanner
  const handleSimulateCheckIn = (pnmId: string) => {
    setDashboardData((prev: any) => {
      if (!prev || !prev.pnms) return prev;
      const updatedPnms = prev.pnms.map((p: any) => {
        if (p.id === pnmId) {
          const updated = {
            ...p,
            attendanceCount: p.attendanceCount + 1
          };
          if (selectedPnm && selectedPnm.id === pnmId) {
            setSelectedPnm(updated);
          }
          return updated;
        }
        return p;
      });
      return { ...prev, pnms: updatedPnms };
    });
    showToast("Checked in successfully! Attendance count updated.", "success");
  };

  // Forgot password handler (Mobile)
  const handleMobileForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
      showToast("Password reset link sent!", "success");
      setTimeout(() => {
        setForgotSuccess(false);
        setShowForgotPassword(false);
        setForgotEmail("");
      }, 1500);
    }, 1000);
  };

  // Presidential Admin: Add member
  const handleAddMobileMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showToast("Member name is required.", "error");
      return;
    }

    const newId = `demo-member-${Date.now()}`;
    const newMember: any = {
      id: newId,
      name: newMemberName.trim(),
      email: newMemberEmail.trim() || null,
      phone: newMemberPhone.trim() || null,
      pledgeClass: "Beta Gamma",
      status: "ACTIVE",
    };

    if (newMemberRole === "actives") {
      newMember.position = newMemberPosition.trim() || "Member";
      newMember.year = "Sophomore";
      newMember.major = "Business Administration";
    } else {
      newMember.graduationYear = parseInt(newMemberGradYear, 10) || new Date().getFullYear();
      newMember.employer = "Self-Employed";
      newMember.jobTitle = "Consultant";
      newMember.city = "Los Angeles";
      newMember.state = "CA";
      newMember.bio = "Happy to connect with actives!";
    }

    setDashboardData((prev: any) => {
      if (!prev) return prev;
      const updatedRoster = { ...prev.roster };
      if (newMemberRole === "actives") {
        updatedRoster.actives = [...(updatedRoster.actives || []), newMember];
      } else {
        updatedRoster.alumni = [...(updatedRoster.alumni || []), newMember];
      }
      return {
        ...prev,
        roster: updatedRoster,
      };
    });

    showToast(`${newMemberName} added to directory.`, "success");
    
    // Reset form
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberPhone("");
    setNewMemberPosition("");
    setNewMemberRole("actives");
    setShowAddMemberModal(false);
  };

  // Presidential Admin: Remove member
  const handleRemoveMobileMember = (id: string, name: string, memberType: "actives" | "alumni") => {
    setConfirmModal({
      title: "Remove Member?",
      message: `Are you sure you want to remove ${name} from the roster? This cannot be undone.`,
      onConfirm: () => {
        setDashboardData((prev: any) => {
          if (!prev) return prev;
          const updatedRoster = { ...prev.roster };
          if (memberType === "actives") {
            updatedRoster.actives = (updatedRoster.actives || []).filter((b: any) => b.id !== id);
          } else {
            updatedRoster.alumni = (updatedRoster.alumni || []).filter((al: any) => al.id !== id);
          }
          return {
            ...prev,
            roster: updatedRoster,
          };
        });
        showToast(`${name} removed from roster.`, "success");
      }
    });
  };

  // Presidential Admin: Send reset link
  const handleSendMobileResetLink = (email: string | null, name: string) => {
    if (!email) {
      showToast(`No email on file for ${name}.`, "error");
      return;
    }
    showToast(`Password reset link sent to ${email}`, "success");
  };

  // Filters for chapter list search
  const filteredChapters = allChapters.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.school && t.school.toLowerCase().includes(q)) ||
      t.subdomain.toLowerCase().includes(q)
    );
  });

  // Merge announcements and career opportunities into a unified Feed
  const combinedFeed = React.useMemo(() => {
    if (!dashboardData) return [];
    
    const rawAnnouncements = (dashboardData.announcements || []).map((a: any) => ({
      ...a,
      feedType: "announcement" as const,
      sortDate: new Date(a.createdAt)
    }));
    
    const rawCareers = (dashboardData.careers || []).map((c: any) => ({
      ...c,
      feedType: "career" as const,
      sortDate: new Date(c.createdAt),
      title: `Career Post: ${c.title}`
    }));
    
    return [...rawAnnouncements, ...rawCareers].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.sortDate.getTime() - a.sortDate.getTime();
    });
  }, [dashboardData]);

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col lg:flex-row items-center justify-center gap-8 p-4 pt-20 pb-6 md:p-8 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 font-sans text-slate-200 relative">
      
      {/* 3D WebGL Plexus Background */}
      <WebGLBackground />

      {/* Mobile-Friendly Sticky Top Header (Shown under lg viewports) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-[150] select-none">
        <div className="flex items-center gap-2">
          <img src="/brand/greekstack-mark.png?v=2" className="w-8 h-8 rounded-lg object-contain shadow-md" alt="Greekstack Logo" />
          <div>
            <span className="text-xs font-bold text-white tracking-wider uppercase block leading-none">Greekstack App</span>
            <span className="text-[8px] text-slate-400 mt-0.5 block">{selectedBrand.letters} • {role === "brother" ? "Active" : "Alumnus"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => window.location.href = "/"}
            className="px-2.5 py-1.5 text-[10px] font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition"
          >
            Website
          </button>
          {/* Sign in — a real chapter member taps here to log into their live
              account (this screen is the demo). */}
          <button
            onClick={() => window.location.href = "/login"}
            className="px-2.5 py-1.5 text-[10px] font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition"
          >
            Sign in
          </button>
          <button
            onClick={() => setShowPricingModal(true)}
            className="px-2.5 py-1.5 text-[10px] font-bold text-slate-950 bg-gradient-to-r from-blue-400 to-sky-400 hover:opacity-90 rounded-lg transition"
          >
            Launch
          </button>
        </div>
      </div>

      {/* Dynamic styling injector matching selected brand */}
      <style dangerouslySetInnerHTML={{ __html: `
        .brand-focus:focus {
          border-color: ${selectedBrand.primaryColor} !important;
          box-shadow: 0 0 0 2px ${selectedBrand.primaryColor}20 !important;
          outline: none !important;
        }
      `}} />

      {/* Decorative background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-800/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Interactive Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowBookingModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 w-full max-w-md space-y-5 shadow-2xl relative animate-scale-in text-left text-slate-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowBookingModal(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-white/5 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1.5 border-b border-white/10 pb-3">
              <div className="inline-flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Book walkthrough
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">Schedule a Call with Ben</h3>
              <p className="text-xs text-slate-400">Pick a time to walk through the custom options for your chapter.</p>
            </div>

            {bookingSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm mx-auto animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Meeting Requested!</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  We&apos;ve sent a calendar invite to <span className="text-blue-400 font-semibold">{bookingEmail}</span>. Looking forward to speaking!
                </p>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="mt-4 px-5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setBookingSubmitted(true); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      required
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Mercer"
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="president@chapter.edu"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 to-sky-400 hover:opacity-95 shadow-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Calendar className="w-4 h-4" /> Confirm Booking
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Interactive Pricing / Launch Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPricingModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 w-full max-w-2xl space-y-6 shadow-2xl relative animate-scale-in text-left text-slate-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPricingModal(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-white/5 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1.5 border-b border-white/10 pb-3">
              <div className="inline-flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                <img src="/brand/greekstack-mark.png?v=2" className="w-3.5 h-3.5 object-contain" alt="" /> Launch Greekstack App
              </div>
              <h3 className="text-xl font-bold text-white leading-tight">Choose Your Chapter Plan</h3>
              <p className="text-xs text-slate-400">Unleash the full white-label platform for your chapter. Cancel anytime.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02] flex flex-col space-y-4 hover:border-white/20 transition">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform Monthly</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">$50</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-[10px] text-amber-400 font-semibold">+ $200 each rush cycle</p>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> First month 100% free</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Unlimited members & officers</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Isolated database schema</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/onboard"}
                  className="w-full py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition"
                >
                  Start Free Month
                </button>
              </div>

              {/* Yearly Plan (Featured) */}
              <div className="border border-sky-500/30 rounded-2xl p-5 bg-sky-500/[0.03] flex flex-col space-y-4 hover:border-sky-500/40 transition relative overflow-hidden">
                <div className="absolute right-0 top-0 bg-sky-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                  Best Value
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Platform Yearly</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">$800</span>
                    <span className="text-xs text-slate-400">/ year</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold">All rush fees included</p>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-sky-400" /> Save $100+ annually</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-sky-400" /> No per-cycle rush fees</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-sky-400" /> Premium priority support</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/onboard"}
                  className="w-full py-2 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 to-sky-400 hover:opacity-95 shadow-md transition"
                >
                  Deploy Yearly
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center leading-relaxed pt-2 border-t border-white/10">
              * Dues are processed securely via Stripe. Stripe standard card transaction rates (2.9% + 30¢) apply with no platform markup.
            </p>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Left of the phone mockup) */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 space-y-6 shadow-2xl relative z-10 text-left">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <img src="/brand/greekstack-mark.png?v=2" className="w-10 h-10 rounded-xl object-contain shadow-md" alt="Greekstack Logo" />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Interactive Demo
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1.5">Greekstack App</h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Experience the active brother and alumnus mobile application. Browse recruitment, pay dues, view calendar RSVPs, vote on elections, and check chore wheels.
          </p>
        </div>

        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Chapter</span>
            <div className="text-xs font-semibold text-slate-200 bg-white/5 border border-white/5 px-3 py-2 rounded-xl">
              {selectedBrand.letters} • {selectedBrand.name}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Role View</span>
            <div className="text-xs font-semibold text-slate-200 bg-white/5 border border-white/5 px-3 py-2 rounded-xl capitalize">
              {role === "brother" ? "Active Brother" : "Alumnus Profile"}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="space-y-3 pt-5 border-t border-white/10">
          <button
            onClick={() => window.location.href = "/"}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Website
          </button>

          {/* Sign in — sends a real chapter member to the live login (this view is
              a demo; existing brothers/alumni log into their actual chapter here). */}
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in
          </button>

          <button
            onClick={() => { setShowBookingModal(true); setBookingSubmitted(false); }}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Calendar className="w-3.5 h-3.5" /> Book a Meeting
          </button>

          <button
            onClick={() => setShowPricingModal(true)}
            className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 via-sky-400 to-amber-300 hover:opacity-95 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Launch Chapter Now
          </button>
        </div>
      </div>

      {/* Phone chassis & screen simulator wrapper */}
      <div 
        className="relative transition-all select-none z-10 flex items-center justify-center shrink-0 w-full max-w-[310px] sm:max-w-[340px] md:max-w-md"
        style={{ perspective: "1000px" }}
      >
        {/* Physical side buttons sticking out behind the chassis */}
        <div className="hidden sm:block absolute -left-[8px] lg:-left-[11px] top-[120px] lg:top-[140px] w-[2px] lg:w-[3px] h-[30px] lg:h-[40px] bg-slate-800 rounded-l-md" />
        <div className="hidden sm:block absolute -left-[8px] lg:-left-[11px] top-[160px] lg:top-[190px] w-[2px] lg:w-[3px] h-[30px] lg:h-[40px] bg-slate-800 rounded-l-md" />
        <div className="hidden sm:block absolute -right-[8px] lg:-right-[11px] top-[140px] lg:top-[160px] w-[2px] lg:w-[3px] h-[45px] lg:h-[60px] bg-slate-800 rounded-r-md" />

        <div
          onMouseMove={handlePhoneMouseMove}
          onMouseEnter={handlePhoneMouseEnter}
          onMouseLeave={handlePhoneMouseLeave}
          className="w-full h-[580px] sm:h-[640px] lg:h-[820px] rounded-[36px] lg:rounded-[48px] border-[6px] sm:border-[8px] lg:border-[12px] border-slate-800 bg-white overflow-hidden relative flex flex-col transition-all duration-100 ease-out z-10"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHoveringPhone ? 1.015 : 1})`,
            boxShadow: isHoveringPhone 
              ? `${-rotateY * 3.5}px ${rotateX * 3.5 + 24}px 55px -10px rgba(0,0,0,0.9)` 
              : '0 20px 50px -10px rgba(0,0,0,0.85)',
            transition: isHoveringPhone ? 'transform 0.05s ease-out, box-shadow 0.05s ease-out' : 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {/* Glass reflection glare */}
          <div 
            className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay transition-opacity duration-300"
            style={{
              opacity: isHoveringPhone ? 0.35 : 0.08,
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)`,
            }}
          />

          {/* Mini dynamic island notch / camera bar on mobile, full sized on desktop */}
          <div className="absolute top-1.5 lg:top-2.5 left-1/2 -translate-x-1/2 w-20 lg:w-32 h-3.5 lg:h-6 rounded-full bg-black z-50 flex items-center justify-between px-2 lg:px-3 text-[8px] lg:text-[10px] text-slate-500">
            <span className="font-semibold text-slate-400 select-none hidden sm:inline">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 lg:w-2.5 h-1.5 lg:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Top iOS Status Bar Area */}
          <div className="h-4 lg:h-10 shrink-0 bg-white" />

        {/* Client Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative text-slate-900 bg-slate-50">
          
          {/* Custom iOS-style Toast Notification */}
          {toast && (
            <div className="absolute top-4 left-4 right-4 z-[100] animate-spring-in pointer-events-none">
              <div className="bg-white/95 backdrop-blur border border-slate-200/80 rounded-2xl shadow-xl p-3 flex items-center gap-3">
                <div 
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: toast.type === "success" ? "#e6f4ea" : toast.type === "error" ? "#fce8e6" : "#e8f0fe",
                    color: toast.type === "success" ? "#137333" : toast.type === "error" ? "#c5221f" : "#1a73e8"
                  }}
                >
                  {toast.type === "success" ? (
                    <Check className="w-4.5 h-4.5" />
                  ) : toast.type === "error" ? (
                    <X className="w-4.5 h-4.5" />
                  ) : (
                    <Info className="w-4.5 h-4.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 leading-tight">System Notification</p>
                  <p className="text-[10px] text-slate-500 truncate leading-snug mt-0.5">{toast.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Sleek Confirmation Modal */}
          {confirmModal && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6" onClick={() => setConfirmModal(null)}>
              <div className="bg-white rounded-3xl border border-slate-100 p-5 w-full max-w-xs space-y-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="text-center space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-950">{confirmModal.title}</h4>
                  <p className="text-xs text-slate-500 leading-normal">{confirmModal.message}</p>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition"
                    style={{ backgroundColor: selectedBrand.primaryColor }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Forgot Password Overlay Modal */}
          {showForgotPassword && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6" onClick={() => setShowForgotPassword(false)}>
              <div className="bg-white rounded-3xl border border-slate-100 p-5 w-full max-w-xs space-y-4 shadow-2xl animate-scale-in text-left" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" style={{ color: selectedBrand.primaryColor }} />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reset Password</h4>
                  </div>
                  <button onClick={() => setShowForgotPassword(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {forgotSuccess ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm mx-auto animate-bounce">
                      <Check className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">Reset Link Dispatched!</h5>
                    <p className="text-[10px] text-slate-500">Check your email for instructions to choose a new password.</p>
                  </div>
                ) : (
                  <form onSubmit={handleMobileForgotSubmit} className="space-y-3">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Enter your email address below. We'll send you a link to reset your account password.
                    </p>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="brother@usc.edu"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: selectedBrand.primaryColor }}
                    >
                      {forgotLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Send Recovery Link"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Custom Add Member Overlay Modal (President Console) */}
          {showAddMemberModal && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6" onClick={() => setShowAddMemberModal(false)}>
              <div className="bg-white rounded-3xl border border-slate-100 p-5 w-full max-w-xs space-y-4 shadow-2xl animate-scale-in text-left max-h-[85%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add New Member</h4>
                  </div>
                  <button onClick={() => setShowAddMemberModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <form onSubmit={handleAddMobileMember} className="space-y-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Johnny Adams"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="johnny@usc.edu"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      placeholder="555-0192"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Chapter Roster Role</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setNewMemberRole("actives")}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition ${
                          newMemberRole === "actives" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500"
                        }`}
                      >
                        Active Brother
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMemberRole("alumni")}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition ${
                          newMemberRole === "alumni" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500"
                        }`}
                      >
                        Alumnus
                      </button>
                    </div>
                  </div>

                  {newMemberRole === "actives" ? (
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Officer Position (Optional)</label>
                      <input
                        type="text"
                        value={newMemberPosition}
                        onChange={(e) => setNewMemberPosition(e.target.value)}
                        placeholder="e.g. Rush Chair, Secretary"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Graduation Year</label>
                      <input
                        type="number"
                        value={newMemberGradYear}
                        onChange={(e) => setNewMemberGradYear(e.target.value)}
                        placeholder="2020"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] mt-2"
                    style={{ backgroundColor: selectedBrand.primaryColor }}
                  >
                    Add Member Record
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {/* 1. Onboarding Chapter Selection */}
          {!selectedTenant && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
              <div className="text-center my-6">
                <div className="inline-flex mb-4">
                  <img src="/brand/greekstack-mark.png?v=2" className="w-16 h-16 rounded-2xl object-contain shadow-md" alt="Greekstack Logo" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Greekstack App</h1>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Access your chapter roster, submit dues securely, and view career networking opportunities. Select your chapter to start.
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-4 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chapter or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm placeholder:text-slate-400 text-slate-900 transition brand-focus"
                />
              </div>

              {/* Active list */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
                {filteredChapters.length > 0 ? (
                  filteredChapters.map((t) => {
                    const br = FRATERNITY_BRANDS.find(b => b.id === t.brandId) || FRATERNITY_BRANDS[0];
                    const isDemoItem = t.id.startsWith("demo-");
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTenant(t)}
                        className="w-full text-left p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 flex items-center justify-between group transition shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-sm shrink-0"
                            style={{ backgroundColor: br.primaryColor + '10', borderColor: br.primaryColor + '20', color: br.primaryColor }}
                          >
                            {br.letters}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                                {t.name}
                              </h4>
                              {isDemoItem && (
                                <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Demo</span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{t.school || "Greekstack Chapter"}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transform group-hover:translate-x-0.5 transition" />
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No active chapters found.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Login Page */}
          {selectedTenant && !token && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <button
                  onClick={() => { setSelectedTenant(null); setError(null); }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" /> Back to Chapters
                </button>
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedBrand.primaryColor, boxShadow: `0 0 8px ${selectedBrand.primaryColor}` }}
                />
              </div>

              <div className="text-center mb-6">
                <span 
                  className="text-[10px] font-bold tracking-widest uppercase border px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                >
                  {selectedBrand.letters} USC CHAPTER
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-3 leading-tight">{selectedTenant.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedTenant.school}</p>
              </div>

              {/* Role Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRole("brother")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    role === "brother"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Active Brother
                </button>
                <button
                  type="button"
                  onClick={() => setRole("alumni")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    role === "alumni"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Alumni Portal
                </button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === "brother" ? "brother@usc.edu" : "alumnus@alumni.com"}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 transition brand-focus"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 transition brand-focus"
                  />
                  <div className="flex justify-between items-center text-[10px] pt-1.5 px-0.5">
                    <span></span>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-slate-500 hover:text-slate-950 transition font-semibold underline underline-offset-2"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-[11px] text-red-600 leading-normal">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  style={{ backgroundColor: selectedBrand.primaryColor }}
                >
                  {authLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Enter Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 3. Dashboard views */}
          {token && selectedTenant && (
            <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
              
              {/* App Status Header */}
              <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-xs shrink-0 select-none"
                    style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                  >
                    {selectedBrand.letters}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[150px]">
                      {dashboardData?.chapter?.name || selectedTenant.name}
                    </h3>
                    <span className="text-[9px] text-slate-500 block truncate max-w-[150px]">
                      {dashboardData?.chapter?.schoolName || selectedTenant.school}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isDemo && (
                    <span className="text-[8px] font-black text-amber-700 uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shadow-sm">
                      DEMO VIEW
                    </span>
                  )}
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md transition text-slate-700 hover:text-slate-900"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                      {role === "brother" ? "BROTHER" : "ALUMNUS"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Main Scrollable Viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                    <span className="text-xs">Connecting securely...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-xs text-red-600">{error}</p>
                    <button
                      onClick={() => handleSignOut()}
                      className="text-xs text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      Return to Login
                    </button>
                  </div>
                ) : (
                  <>
                    {/* A. FEED TAB (Combined News + Job Listings) */}
                    {activeTab === "feed" && (
                      <div className="space-y-4">
                        {/* Welcome widget */}
                        <div 
                          className="border p-4 rounded-3xl relative overflow-hidden"
                          style={{ background: `linear-gradient(to right, ${selectedBrand.primaryColor}12, ${selectedBrand.primaryColor}06, #ffffff)`, borderColor: `${selectedBrand.primaryColor}20` }}
                        >
                          <h4 className="text-xs font-semibold text-slate-500">Welcome Back,</h4>
                          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                            {dashboardData?.profile?.name || "Member"}
                          </h2>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedBrand.primaryColor }} />
                            {role === "brother" 
                              ? `${dashboardData?.profile?.position || "Active Member"} • ${dashboardData?.profile?.pledgeClass || "Brother"}` 
                              : `Class of ${dashboardData?.profile?.graduationYear || "Alumnus"}`
                            }
                          </p>

                          {role === "brother" && dashboardData?.standing && (
                            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Chapter Standing</span>
                                <div className="text-xs font-bold text-emerald-600 mt-0.5">{dashboardData.standing.standing}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Financials</span>
                                <div className={`text-xs font-bold mt-0.5 ${dashboardData.profile?.duesPaid ? "text-emerald-600" : "text-amber-600 font-bold"}`}>
                                  {dashboardData.profile?.duesPaid ? "Paid" : "Unpaid"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Merged Timeline Feed */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> News & Opportunity Feed
                            </h3>
                            {role === "brother" && (
                              <button
                                onClick={() => setShowPostAnnModal(true)}
                                className="px-2.5 py-1 text-[9px] font-bold text-white rounded-lg transition active:scale-95 flex items-center gap-1 shadow-sm"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                <Sparkles className="w-2.5 h-2.5" /> Post News
                              </button>
                            )}
                          </div>

                          {combinedFeed.length > 0 ? (
                            combinedFeed.map((item: any) => {
                              const isExpanded = expandedAnnouncementId === item.id;
                              const isCareer = item.feedType === "career";
                              
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setExpandedAnnouncementId(isExpanded ? null : item.id)}
                                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-sm ${
                                    item.pinned
                                      ? "border-amber-200"
                                      : "border-slate-100 hover:border-slate-200"
                                  }`}
                                  style={item.pinned ? { borderLeft: `4px solid ${selectedBrand.primaryColor}` } : {}}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isCareer ? (
                                          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded">
                                            <Briefcase className="w-2.5 h-2.5" /> Career Post
                                          </span>
                                        ) : (
                                          item.pinned && (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded">
                                              <Pin className="w-2.5 h-2.5" /> Pinned
                                            </span>
                                          )
                                        )}
                                        <h4 className="text-xs font-bold text-slate-900">
                                          {isCareer ? item.title : item.title}
                                        </h4>
                                      </div>
                                      <span className="text-[9px] text-slate-400 block">
                                        Posted by {item.postedByName || item.authorName} ({item.postedByRole || item.authorRole})
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 shrink-0">
                                      {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                    </span>
                                  </div>

                                  <div className={`text-[11px] text-slate-600 mt-2.5 leading-relaxed ${
                                    isExpanded ? "" : "line-clamp-2"
                                  }`}>
                                    {item.description || item.body}
                                  </div>

                                  {/* Expanded Career Details in Feed */}
                                  {isCareer && isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-[10px] text-slate-500" onClick={(e) => e.stopPropagation()}>
                                      {item.requirements && (
                                        <div>
                                          <span className="font-bold text-slate-800 uppercase text-[8px] block mb-0.5">Qualifications</span>
                                          <p>{item.requirements}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div><strong>Company:</strong> {item.company}</div>
                                        {item.salary && <div><strong>Salary:</strong> {item.salary}</div>}
                                        {item.location && <div className="col-span-2"><strong>Location:</strong> {item.location}</div>}
                                      </div>
                                      
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                        <span className="font-bold text-slate-600 uppercase text-[8px] block">Referral Contacts</span>
                                        <p className="text-slate-800 font-medium text-xs">{item.contactName}</p>
                                        <div className="flex gap-2 pt-1.5">
                                          <a
                                            href={`mailto:${item.contactEmail}?subject=Referral Inquiry: ${item.title}`}
                                            className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1 transition"
                                          >
                                            <Mail className="w-3 h-3 text-slate-500" /> Email Referrer
                                          </a>
                                          {item.contactPhone && (
                                            <a
                                              href={`tel:${item.contactPhone}`}
                                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition"
                                            >
                                              <Phone className="w-3 h-3" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end text-[9px] text-slate-400 mt-2">
                                    <span className="flex items-center gap-0.5">
                                      {isExpanded ? "Collapse" : "Expand"} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 shadow-sm">
                              No feed updates available.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* B. EVENTS TAB */}
                    {activeTab === "events" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1.5 shrink-0">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> Chapter Calendar
                          </h3>
                        </div>

                        {dashboardData?.events?.length > 0 ? (
                          dashboardData.events.map((e: any) => {
                            const isGoing = e.myRsvp?.status === "GOING";
                            const isMaybe = e.myRsvp?.status === "MAYBE";
                            const isNotGoing = e.myRsvp?.status === "NOT_GOING";
                            const starts = new Date(e.startsAt);
                            
                            return (
                              <div key={e.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3 text-left">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <span 
                                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                                      style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                    >
                                      {e.category}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-900 mt-2">{e.name}</h4>
                                  </div>
                                  
                                  <div className="text-center bg-slate-50 border border-slate-100 rounded-lg p-1.5 min-w-[44px]">
                                    <div className="text-[8px] uppercase font-bold" style={{ color: selectedBrand.primaryColor }}>
                                      {starts.toLocaleDateString([], { month: "short" })}
                                    </div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {starts.getDate()}
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[10px] text-slate-600 leading-normal line-clamp-2">
                                  {e.description || "No description provided."}
                                </p>

                                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] text-slate-500 border-t border-slate-50 pt-2">
                                  {e.location && (
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {e.location}</span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 shrink-0" />{" "}
                                    {starts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                  </span>
                                  {e.dressCode && (
                                    <span className="flex items-center gap-1"><Award className="w-3 h-3 shrink-0" /> {e.dressCode}</span>
                                  )}
                                </div>

                                {role === "brother" && (
                                  <div className="pt-2 flex items-center gap-2">
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "GOING")}
                                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                        isGoing
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-100 hover:text-slate-900"
                                      }`}
                                    >
                                      {isGoing && <Check className="w-3 h-3" />} Going
                                    </button>
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "MAYBE")}
                                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                        isMaybe
                                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-100 hover:text-slate-900"
                                      }`}
                                    >
                                      {isMaybe && <Check className="w-3 h-3" />} Maybe
                                    </button>
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "NOT_GOING")}
                                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                        isNotGoing
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-100 hover:text-slate-900"
                                      }`}
                                    >
                                      {isNotGoing && <Check className="w-3 h-3" />} Decline
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 shadow-sm">
                            No upcoming events on the schedule.
                          </div>
                        )}
                      </div>
                    )}

                    {/* C. RUSH TAB (Brother-only PNM Database / Pledges view) */}
                    {activeTab === "rush" && role === "brother" && (
                      isRushActive ? (
                        <div className="space-y-3 flex flex-col flex-1 overflow-hidden text-left">
                          {/* Rush Statistics */}
                          <div className="grid grid-cols-3 gap-2 text-center shrink-0">
                            <div className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                              <span className="text-[18px] font-black text-slate-900">{dashboardData?.pnms?.length || 0}</span>
                              <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Total PNMs</p>
                            </div>
                            <div className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                              <span className="text-[18px] font-black text-slate-900">
                                {dashboardData?.pnms?.filter((p: any) => p.status === "BID_EXTENDED").length || 0}
                              </span>
                              <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Bids Sent</p>
                            </div>
                            <div className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                              <span className="text-[18px] font-black text-slate-900">
                                {dashboardData?.pnms?.filter((p: any) => p.attendanceCount > 0).length || 0}
                              </span>
                              <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Attended</p>
                            </div>
                          </div>

                          {/* Search & Filters */}
                          <div className="space-y-2 shrink-0">
                            <div className="relative">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Search PNM name or major..."
                                value={rushSearch}
                                onChange={(e) => setRushSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl focus:border-slate-300 outline-none text-xs text-slate-900 shadow-sm"
                              />
                            </div>

                            {/* End Rush Toggle for Officers */}
                            {(dashboardData?.profile?.position === "President" || dashboardData?.profile?.name === "Alex Mercer") && (
                              <button
                                onClick={() => {
                                  setIsRushActive(false);
                                  showToast("Rush Season ended. Portal converted to New Members & Sober Driver Schedule.", "success");
                                }}
                                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition shadow-sm"
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-400" /> Close Rush Season
                              </button>
                            )}

                            {/* Quick filters */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                              {(["ALL", "ACTIVE", "BID_EXTENDED", "DROPPED"] as const).map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setRushFilter(f)}
                                  className={`px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider rounded-lg border transition ${
                                    rushFilter === f
                                      ? "bg-slate-900 border-slate-900 text-white"
                                      : "bg-white border-slate-100 text-slate-500 hover:text-slate-900"
                                  }`}
                                >
                                  {f.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* PNM list stream */}
                          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[320px] pr-1">
                            {(() => {
                              const list = (dashboardData?.pnms || []).filter((p: any) => {
                                const q = rushSearch.toLowerCase();
                                const matchesSearch = p.name.toLowerCase().includes(q) || (p.major && p.major.toLowerCase().includes(q));
                                const matchesFilter = rushFilter === "ALL" || p.status === rushFilter;
                                return matchesSearch && matchesFilter;
                              });

                              if (list.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                    No candidates match your filters.
                                  </div>
                                );
                              }

                              return list.map((p: any) => (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedPnm(p)}
                                  className="w-full p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition flex items-center justify-between gap-3 text-left shadow-sm group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div 
                                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                      style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                    >
                                      {p.name.split(" ").map((n: string) => n[0]).join("")}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                        {p.name}
                                        {p.status === "BID_EXTENDED" && (
                                          <span className="text-[7px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded">Bid Sent</span>
                                        )}
                                      </h5>
                                      <span className="text-[9px] text-slate-500 block truncate">
                                        {p.year} • {p.major || "No Major Specified"} • {p.hometown}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                      <span className="text-[10px] font-bold text-slate-800">
                                        {p.votesAverage > 0 ? `+${p.votesAverage}` : p.votesAverage}
                                      </span>
                                      <span className="text-[8px] text-slate-400 block">{p.votesCount} votes</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition" />
                                  </div>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 flex flex-col flex-1 overflow-hidden text-left">
                          {/* Title block with Reopen Button */}
                          <div className="flex items-center justify-between bg-white p-3 border border-slate-100 rounded-2xl shadow-sm shrink-0">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">New Members Portal</h4>
                              <p className="text-[8px] text-slate-400 mt-0.5">Active Pledges & Sober Drivers</p>
                            </div>
                            <button
                              onClick={() => {
                                setIsRushActive(true);
                                showToast("Rush season re-opened.", "info");
                              }}
                              className="px-2.5 py-1 text-[8px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                              Re-open Rush
                            </button>
                          </div>

                          {/* Time Simulator block */}
                          <div className="p-3 bg-slate-950 text-slate-200 rounded-2xl border border-white/5 space-y-2 shadow-inner shrink-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-400" /> Time Simulator
                              </span>
                              <span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded">
                                {simulatedDay} @ {simulatedHour === 22 ? "10:00 PM" : simulatedHour === 23 ? "11:00 PM" : simulatedHour === 0 ? "12:00 AM" : "1:00 AM"}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {(["Friday", "Saturday", "Other"] as const).map((day) => (
                                <button
                                  key={day}
                                  onClick={() => setSimulatedDay(day)}
                                  className={`flex-1 py-1 text-[8px] font-bold rounded transition ${
                                    simulatedDay === day ? "bg-blue-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {([22, 23, 0, 1] as const).map((hour) => (
                                <button
                                  key={hour}
                                  onClick={() => setSimulatedHour(hour)}
                                  className={`flex-1 py-1 text-[8px] font-bold rounded transition ${
                                    simulatedHour === hour ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  }`}
                                >
                                  {hour === 22 ? "10pm" : hour === 23 ? "11pm" : hour === 0 ? "12am" : "1am"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Sub tabs: Directory vs Schedule */}
                          <div className="flex border-b border-slate-100 shrink-0">
                            <button
                              onClick={() => setActiveSubTab("directory")}
                              className={`flex-1 pb-1.5 text-[10px] font-bold border-b-2 text-center transition-all ${
                                activeSubTab === "directory" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
                              }`}
                            >
                              Pledge List
                            </button>
                            <button
                              onClick={() => setActiveSubTab("schedule")}
                              className={`flex-1 pb-1.5 text-[10px] font-bold border-b-2 text-center transition-all ${
                                activeSubTab === "schedule" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
                              }`}
                            >
                              Sober Schedule
                            </button>
                          </div>

                          {activeSubTab === "directory" ? (
                            <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
                              {/* New Member List */}
                              {(() => {
                                // Filter mock accepted pledges
                                const list = (dashboardData?.pnms || []).map((p: any) => {
                                  // For simulation, let's treat active/bid_extended PNMs as pledges
                                  const isDriverNow = 
                                    (simulatedDay === "Friday" && simulatedHour >= 22 && simulatedHour < 24 && soberAssignments["Friday-22"] === p.id) ||
                                    (simulatedDay === "Friday" && (simulatedHour === 0 || simulatedHour === 1) && soberAssignments["Friday-00"] === p.id) ||
                                    (simulatedDay === "Saturday" && simulatedHour >= 22 && simulatedHour < 24 && soberAssignments["Saturday-22"] === p.id) ||
                                    (simulatedDay === "Saturday" && (simulatedHour === 0 || simulatedHour === 1) && soberAssignments["Saturday-00"] === p.id);
                                  return { ...p, isDriverNow };
                                });

                                return list.map((p: any) => (
                                  <div
                                    key={p.id}
                                    className={`p-3 bg-white rounded-2xl border flex items-center justify-between gap-3 text-left shadow-sm transition-all ${
                                      p.isDriverNow ? "ring-2 ring-amber-500/30 border-amber-300 bg-amber-500/[0.01]" : "border-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div 
                                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                        style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                      >
                                        {p.name.split(" ").map((n: string) => n[0]).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                          {p.name}
                                          {p.isDriverNow && (
                                            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-900 border border-amber-200 text-[6px] font-bold px-1 rounded animate-pulse">
                                              <Key className="w-2 h-2" /> DRIVING
                                            </span>
                                          )}
                                        </h5>
                                        <span className="text-[9px] text-slate-500 block truncate">
                                          {p.phone} • {p.major || "Freshman"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      {p.isDriverNow ? (
                                        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-bounce">
                                          <Car className="w-3.5 h-3.5" />
                                        </div>
                                      ) : (
                                        <span className="text-[8px] font-bold text-slate-400 block">Standby</span>
                                      )}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          ) : (
                            <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
                              {/* Sober Driver Schedule Assignment List */}
                              {[
                                { key: "Friday-22", label: "Friday Late Night (10pm-12am)" },
                                { key: "Friday-00", label: "Friday Morning (12am-2am)" },
                                { key: "Saturday-22", label: "Saturday Late Night (10pm-12am)" },
                                { key: "Saturday-00", label: "Saturday Morning (12am-2am)" },
                              ].map((s) => {
                                const activeId = soberAssignments[s.key] || "";
                                const isCurrentShift = 
                                  (s.key === "Friday-22" && simulatedDay === "Friday" && simulatedHour >= 22 && simulatedHour < 24) ||
                                  (s.key === "Friday-00" && simulatedDay === "Friday" && (simulatedHour === 0 || simulatedHour === 1)) ||
                                  (s.key === "Saturday-22" && simulatedDay === "Saturday" && simulatedHour >= 22 && simulatedHour < 24) ||
                                  (s.key === "Saturday-00" && simulatedDay === "Saturday" && (simulatedHour === 0 || simulatedHour === 1));

                                return (
                                  <div key={s.key} className={`p-2.5 bg-white rounded-xl border transition-all ${
                                    isCurrentShift ? "border-emerald-400 bg-emerald-500/[0.01]" : "border-slate-100"
                                  }`}>
                                    <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-[9px] font-bold text-slate-800 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {s.label}
                                      </span>
                                      {isCurrentShift && (
                                        <span className="text-[6px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full select-none animate-pulse">Active Now</span>
                                      )}
                                    </div>
                                    <select
                                      value={activeId}
                                      onChange={(e) => {
                                        setSoberAssignments((prev) => ({ ...prev, [s.key]: e.target.value }));
                                        showToast("Sober driver assignment updated.", "success");
                                      }}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] outline-none font-medium text-slate-800"
                                    >
                                      <option value="">Select a sober driver...</option>
                                      {(dashboardData?.pnms || []).map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* D. DUES TAB (Brothers) or GIVING TAB (Alumni) */}
                    {activeTab === "dues" && (
                      <div className="space-y-4">
                        {role === "brother" ? (
                          <>
                            {/* Dues dashboard */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center space-y-4">
                              <div 
                                className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border"
                                style={{ backgroundColor: selectedBrand.primaryColor + '12', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                              >
                                <DollarSign className="w-6 h-6" />
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                  {dashboardData?.dues?.config?.label || "Active Chapter Dues"}
                                </span>
                                <h2 className="text-2xl font-black text-slate-900">
                                  ${((dashboardData?.dues?.config?.amountCents || 0) / 100).toLocaleString([], { minimumFractionDigits: 2 })}
                                </h2>
                                <span className="text-[10px] text-slate-400 block">
                                  Period: {dashboardData?.dues?.config?.year || "Active Semester"}
                                </span>
                              </div>

                              <div className="pt-2 flex justify-center">
                                {dashboardData?.dues?.isPaid ? (
                                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dues Reconciled & Settled
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm animate-pulse">
                                    <AlertCircle className="w-4 h-4 text-amber-500" /> Action Required: Unpaid
                                  </div>
                                )}
                              </div>

                              {!dashboardData?.dues?.isPaid && dashboardData?.dues?.config?.enabled && (
                                <button
                                  type="button"
                                  onClick={isDemo ? handleSimulateStripePay : () => showToast("Initiating checkout session via Stripe Connect...", "info")}
                                  className="w-full py-3 text-white rounded-2xl text-xs font-bold shadow-md transition active:scale-[0.98]"
                                  style={{ backgroundColor: selectedBrand.primaryColor }}
                                >
                                  <CreditCard className="w-4 h-4 mr-1 inline" /> Pay Online w/ Stripe
                                </button>
                              )}
                            </div>

                            {/* Dues logs */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                                Financial Statement Ledger
                              </h4>
                              
                              {dashboardData?.dues?.payments?.length > 0 ? (
                                dashboardData.dues.payments.map((p: any) => (
                                  <div key={p.id} className="p-3.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
                                    <div>
                                      <p className="font-bold text-slate-900">Dues Assessment: {p.year}</p>
                                      <span className="text-[9px] text-slate-400">
                                        Channel: {p.method} • {new Date(p.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-slate-900">${(p.amountCents / 100).toFixed(2)}</p>
                                      <span className={`text-[9px] font-bold uppercase ${
                                        p.status === "PAID" ? "text-emerald-600" : "text-amber-600"
                                      }`}>
                                        {p.status}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 bg-white border border-slate-100 rounded-xl text-center text-xs text-slate-400 shadow-sm">
                                  No transaction logs found.
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Alumni donation panel */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center space-y-4">
                              <div 
                                className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border"
                                style={{ backgroundColor: selectedBrand.primaryColor + '12', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                              >
                                <Heart className="w-6 h-6 fill-current" />
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Alumni Giving Portal</span>
                                <h3 className="text-sm font-bold text-slate-900">Support local scholarship funds</h3>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                                  Contributions settle directly to the local chapter connected Stripe account for housing and recruitment.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => showToast("Initiating donation campaign session...", "info")}
                                className="w-full py-3 text-white rounded-2xl text-xs font-bold shadow-md transition active:scale-[0.98]"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                Secure Donation via Stripe
                              </button>
                            </div>

                            {/* Donation logs */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                                Donation Log Statement
                              </h4>

                              {dashboardData?.dues?.donations?.length > 0 ? (
                                dashboardData.dues.donations.map((d: any) => (
                                  <div key={d.id} className="p-3.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
                                    <div>
                                      <p className="font-bold text-slate-900">{d.campaign || "General Fund"}</p>
                                      <span className="text-[9px] text-slate-400">
                                        {new Date(d.recordedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="text-right font-bold text-slate-900">
                                      ${(d.amountCents / 100).toFixed(2)}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 bg-white border border-slate-100 rounded-xl text-center text-xs text-slate-400 shadow-sm">
                                  No donation history recorded.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* E. DIRECTORY TAB (Actives, Alumni, Careers sub-views) */}
                    {activeTab === "directory" && (
                      <div className="space-y-3 flex-1 flex flex-col overflow-hidden text-left">
                        
                        {/* Directory Switcher tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                          <button
                            onClick={() => { setRosterTab("actives"); setRosterSearch(""); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              rosterTab === "actives"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                               : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            Actives
                          </button>
                          <button
                            onClick={() => { setRosterTab("alumni"); setRosterSearch(""); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              rosterTab === "alumni"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            Alumni
                          </button>
                          <button
                            onClick={() => { setRosterTab("careers"); setRosterSearch(""); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              rosterTab === "careers"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            Careers
                          </button>
                        </div>

                        {/* Search field */}
                        <div className="relative shrink-0">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={
                              rosterTab === "actives"
                                ? "Search actives..."
                                : rosterTab === "alumni"
                                ? "Search alumni network..."
                                : "Search jobs & internships..."
                            }
                            value={rosterSearch}
                            onChange={(e) => setRosterSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl focus:border-slate-300 outline-none text-xs text-slate-900 shadow-sm"
                          />
                        </div>

                        {/* Directory list area */}
                        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                          
                          {/* 1. Actives View */}
                          {rosterTab === "actives" && (
                            (() => {
                              const list = (dashboardData?.roster?.actives || []).filter((b: any) => {
                                const q = rosterSearch.toLowerCase();
                                return (
                                  b.name.toLowerCase().includes(q) ||
                                  (b.position && b.position.toLowerCase().includes(q)) ||
                                  (b.pledgeClass && b.pledgeClass.toLowerCase().includes(q))
                                );
                              });
                              
                              if (list.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                    No brothers found matching query.
                                  </div>
                                );
                              }

                              return list.map((b: any) => (
                                <div key={b.id} className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div 
                                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                      style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                    >
                                      {b.name.split(" ").map((n: string) => n[0]).join("")}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900 truncate">{b.name}</h5>
                                      <span className="text-[9px] text-slate-500 truncate block">
                                        {b.position || `${b.year || "Undergrad"}`} • {b.pledgeClass || "Brother"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {b.email && (
                                      <a
                                        href={`mailto:${b.email}`}
                                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    {b.phone && (
                                      <a
                                        href={`tel:${b.phone}`}
                                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ));
                            })()
                          )}

                          {/* 2. Alumni View */}
                          {rosterTab === "alumni" && (
                            (() => {
                              const list = (dashboardData?.roster?.alumni || []).filter((al: any) => {
                                const q = rosterSearch.toLowerCase();
                                return (
                                  al.name.toLowerCase().includes(q) ||
                                  (al.employer && al.employer.toLowerCase().includes(q)) ||
                                  (al.jobTitle && al.jobTitle.toLowerCase().includes(q)) ||
                                  (al.city && al.city.toLowerCase().includes(q))
                                );
                              });

                              if (list.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                    No matching alumni found.
                                  </div>
                                );
                              }

                              return list.map((al: any) => (
                                <div key={al.id} className="p-3.5 bg-white rounded-2xl border border-slate-100 space-y-2.5 shadow-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div 
                                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                        style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                      >
                                        {al.name.split(" ").map((n: string) => n[0]).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 truncate">{al.name}</h5>
                                        <span className="text-[9px] text-slate-500 block uppercase tracking-wider">
                                          Class of {al.graduationYear} • {al.pledgeClass || "Alum"}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {al.email && (
                                        <a
                                          href={`mailto:${al.email}`}
                                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {al.phone && (
                                        <a
                                          href={`tel:${al.phone}`}
                                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                        >
                                          <Phone className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {al.jobTitle && (
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl text-[10px] text-slate-700">
                                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                                        {al.jobTitle} at {al.employer || "Private Company"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ));
                            })()
                          )}

                          {/* 3. Careers Tab */}
                          {rosterTab === "careers" && (
                            <div className="space-y-3">
                              {/* Post Opp Button */}
                              <button
                                onClick={() => setShowPostJobModal(true)}
                                className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                <Briefcase className="w-3.5 h-3.5" /> Post Job / Internship Opening
                              </button>

                              {/* Careers List */}
                              {(() => {
                                const list = (dashboardData?.careers || []).filter((j: any) => {
                                  const q = rosterSearch.toLowerCase();
                                  return (
                                    j.title.toLowerCase().includes(q) ||
                                    j.company.toLowerCase().includes(q) ||
                                    (j.location && j.location.toLowerCase().includes(q))
                                  );
                                });

                                if (list.length === 0) {
                                  return (
                                    <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                      No openings listed.
                                    </div>
                                  );
                                }

                                return list.map((j: any) => {
                                  const isExpanded = expandedJobId === j.id;
                                  return (
                                    <div
                                      key={j.id}
                                      onClick={() => setExpandedJobId(isExpanded ? null : j.id)}
                                      className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition shadow-sm cursor-pointer space-y-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-xs font-bold text-slate-900 leading-tight">{j.title}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-500 mt-1 block">
                                            {j.company} • {j.location || "Remote"}
                                          </span>
                                        </div>

                                        {j.salary && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded shrink-0">
                                            {j.salary}
                                          </span>
                                        )}
                                      </div>

                                      <p className={`text-[10px] text-slate-600 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                                        {j.description}
                                      </p>

                                      {isExpanded && (
                                        <div className="pt-3 border-t border-slate-100 space-y-3 text-[10px] text-slate-500 transition-all" onClick={(e) => e.stopPropagation()}>
                                          {j.requirements && (
                                            <div>
                                              <span className="font-bold text-slate-800 uppercase text-[8px] block mb-0.5">Requirements</span>
                                              <p className="leading-relaxed">{j.requirements}</p>
                                            </div>
                                          )}

                                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                            <span className="font-bold text-slate-500 uppercase text-[8px] block">Referral Referral Contacts</span>
                                            <p className="text-slate-800 font-semibold text-xs">{j.contactName} ({j.postedByRole === "alumni" ? "Alumnus" : "Brother"})</p>
                                            
                                            <div className="flex gap-2 pt-1.5">
                                              <a
                                                href={`mailto:${j.contactEmail}?subject=Greekstack Career: ${j.title}`}
                                                className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[9px] font-bold text-center text-slate-800 flex items-center justify-center gap-1 transition shadow-sm"
                                              >
                                                <Mail className="w-3 h-3 text-slate-500" /> Email Referrer
                                              </a>
                                              {j.contactPhone && (
                                                <a
                                                  href={`tel:${j.contactPhone}`}
                                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition shadow-sm"
                                                >
                                                  <Phone className="w-3 h-3" />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-50">
                                        <span>Shared by {j.postedByName}</span>
                                        <span className="flex items-center gap-0.5">
                                          {isExpanded ? "Collapse Details" : "View Details"} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                        </span>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                    {/* F. SETTINGS TAB */}
                    {activeTab === "settings" && (
                      <div className="space-y-4 text-left">
                        {/* User Card */}
                        {/* User Card */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2 shadow-sm">
                          <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg text-white border-2"
                            style={{ backgroundColor: selectedBrand.primaryColor, borderColor: selectedBrand.primaryColor + '50' }}
                          >
                            {dashboardData?.profile?.name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2) || "U"}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{dashboardData?.profile?.name}</h4>
                            <p className="text-[10px] text-slate-500">{dashboardData?.profile?.email}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <span 
                              className="text-[9px] px-2.5 py-0.5 rounded border font-semibold uppercase tracking-wider"
                              style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                            >
                              {role} Account
                            </span>
                            <button
                              onClick={() => setShowEditProfileModal(true)}
                              className="text-[9px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition"
                            >
                              Edit Profile
                            </button>
                          </div>
                        </div>

                        {/* Roster details list */}
                        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
                          <div className="p-3.5 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Chapter Tenant</span>
                            <span className="font-semibold text-slate-800">{selectedTenant.name}</span>
                          </div>
                          <div className="p-3.5 flex items-center justify-between text-xs">
                            <span className="text-slate-500">School</span>
                            <span className="font-semibold text-slate-800">{selectedTenant.school}</span>
                          </div>
                          {role === "brother" && (
                            <>
                              <div className="p-3.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Pledge Class</span>
                                <span className="font-semibold text-slate-800">{dashboardData?.profile?.pledgeClass || "Not specified"}</span>
                              </div>
                              <div className="p-3.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Academic Standing</span>
                                <span className="font-semibold text-slate-800">{dashboardData?.profile?.status || "ACTIVE"}</span>
                              </div>
                            </>
                          )}
                          {role === "alumni" && (
                            <>
                              <div className="p-3.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Graduation Year</span>
                                <span className="font-semibold text-slate-800">{dashboardData?.profile?.graduationYear}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* PRESIDENTIAL ADMINISTRATION CONSOLE */}
                        {role === "brother" && (dashboardData?.profile?.position === "President" || dashboardData?.profile?.name === "Alex Mercer") && (
                          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-1.5">
                                <Crown className="w-4 h-4 text-amber-500" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Presidential Admin</h4>
                              </div>
                              <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="text-[9px] font-bold text-white px-2.5 py-1 rounded-lg transition active:scale-95"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                + Add Member
                              </button>
                            </div>
                            
                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                              {/* Actives */}
                              <div className="space-y-1.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Actives ({dashboardData?.roster?.actives?.length || 0})</span>
                                {(dashboardData?.roster?.actives || []).map((b: any) => (
                                  <div key={b.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 text-[10px]">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{b.name}</p>
                                      <p className="text-[8px] text-slate-505 truncate">{b.email || "No email"}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleSendMobileResetLink(b.email, b.name)}
                                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                        title="Send Reset Link"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                      </button>
                                      {b.id !== "demo-brother-id" && (
                                        <button
                                          onClick={() => handleRemoveMobileMember(b.id, b.name, "actives")}
                                          className="p-1.5 hover:bg-red-50 text-red-505 rounded-lg transition"
                                          title="Remove Member"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Alumni */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Alumni ({dashboardData?.roster?.alumni?.length || 0})</span>
                                {(dashboardData?.roster?.alumni || []).map((al: any) => (
                                  <div key={al.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 text-[10px]">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{al.name}</p>
                                      <p className="text-[8px] text-slate-505 truncate">{al.email || "No email"}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleSendMobileResetLink(al.email, al.name)}
                                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                        title="Send Reset Link"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveMobileMember(al.id, al.name, "alumni")}
                                        className="p-1.5 hover:bg-red-50 text-red-505 rounded-lg transition"
                                        title="Remove Member"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                title: "Switch Chapter?",
                                message: "Are you sure you want to return to the Greekstack Chapter Selector?",
                                onConfirm: () => handleSignOut()
                              });
                            }}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                          >
                            <School className="w-4 h-4 text-slate-500" /> Switch Chapter Organization
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                title: "Logout?",
                                message: "Are you sure you want to sign out of your account?",
                                onConfirm: () => handleSignOut()
                              });
                            }}
                            className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                          >
                            <LogOut className="w-4 h-4 text-red-500" /> Logout Securely
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* Rush PNM detail slide drawer */}
              {selectedPnm && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex flex-col justify-end text-left" onClick={() => setSelectedPnm(null)}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 max-h-[85%] overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border"
                          style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                        >
                          {selectedPnm.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{selectedPnm.name}</h4>
                          <span className="text-[10px] text-slate-500">{selectedPnm.status} Candidate</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedPnm(null)}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-[11px]">
                      
                      {/* Details specs */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Hometown</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{selectedPnm.hometown}</p>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Major & School Year</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{selectedPnm.year} • {selectedPnm.major}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">High School</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{selectedPnm.highSchoolInfo || "Not specified"}</p>
                        </div>
                        {selectedPnm.backgroundInfo && (
                          <div className="col-span-2 border-t border-slate-200/60 pt-2">
                            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Vibe & Background</span>
                            <p className="text-slate-600 leading-relaxed mt-1">{selectedPnm.backgroundInfo}</p>
                          </div>
                        )}
                      </div>

                      {/* Interactive Voting Board */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Submit Your Rush Vote</span>
                        
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 justify-between gap-1">
                          {([-2, -1, 0, 1, 2] as const).map((score) => {
                            const isSelected = selectedPnm.myVote === score;
                            const labels = { "-2": "-2", "-1": "-1", "0": "0", "1": "+1", "2": "+2" };
                            
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handlePnmVote(selectedPnm.id, score)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                                  isSelected
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {labels[score.toString() as keyof typeof labels]}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-slate-400 text-center">Votes count towards running averages: {selectedPnm.votesAverage} ({selectedPnm.votesCount} ballots cast)</p>
                      </div>

                      {/* Dynamic door scanner check-in */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl mt-1">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Attendance Log</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">Checked in at {selectedPnm.attendanceCount} events</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSimulateCheckIn(selectedPnm.id)}
                          className="px-3.5 py-1.5 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition"
                        >
                          Simulate Door Scan
                        </button>
                      </div>

                      {/* Impression feed */}
                      <div className="space-y-2.5 pt-2">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Brother Vibe Impressions Note</span>
                        
                        {/* Feed */}
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {selectedPnm.impressions && selectedPnm.impressions.length > 0 ? (
                            selectedPnm.impressions.map((imp: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                <div className="flex justify-between text-[8px] font-bold">
                                  <span className="text-slate-800">{imp.authorName}</span>
                                  <span className={`uppercase ${
                                    imp.tone === "positive" ? "text-emerald-600" : imp.tone === "concern" ? "text-red-500" : "text-slate-500"
                                  }`}>{imp.tone}</span>
                                </div>
                                <p className="text-[10px] text-slate-600 leading-normal">{imp.note}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-slate-400">No notes recorded yet.</div>
                          )}
                        </div>

                        {/* Input form */}
                        <form onSubmit={(e) => handleAddImpression(e, selectedPnm.id)} className="space-y-2 border-t border-slate-100 pt-2.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Write a rush candidate note..."
                              required
                              value={newImpressionNote}
                              onChange={(e) => setNewImpressionNote(e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[11px]"
                            />
                            
                            <select
                              value={newImpressionTone}
                              onChange={(e: any) => setNewImpressionTone(e.target.value)}
                              className="px-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
                            >
                              <option value="positive">Pos</option>
                              <option value="neutral">Neu</option>
                              <option value="concern">Con</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold transition"
                          >
                            Add Roster Note
                          </button>
                        </form>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Posting Career Opportunity Modal */}
              {showPostJobModal && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex flex-col justify-end text-left" onClick={() => { setShowPostJobModal(false); resetJobForm(); setPostJobError(null); }}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 max-h-[88%] overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 className="text-sm font-bold text-slate-955">Post Career Opportunity</h4>
                      </div>
                      <button
                        onClick={() => { setShowPostJobModal(false); resetJobForm(); setPostJobError(null); }}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {postJobSuccess ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                          <Check className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Post Shipped Successfully!</h5>
                        <p className="text-xs text-slate-500">The career opportunity is now live in active feeds and listings.</p>
                      </div>
                    ) : (
                      <form onSubmit={handlePostJob} className="space-y-3.5 pb-8">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Job / Internship Title</label>
                            <input
                              type="text"
                              required
                              value={jobTitle}
                              onChange={(e) => setJobTitle(e.target.value)}
                              placeholder="Software Engineer Intern"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Company Name</label>
                            <input
                              type="text"
                              required
                              value={jobCompany}
                              onChange={(e) => setJobCompany(e.target.value)}
                              placeholder="Google"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Location</label>
                            <input
                              type="text"
                              value={jobLocation}
                              onChange={(e) => setJobLocation(e.target.value)}
                              placeholder="San Francisco, CA"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Salary (Optional)</label>
                            <input
                              type="text"
                              value={jobSalary}
                              onChange={(e) => setJobSalary(e.target.value)}
                              placeholder="$45/hr or $90k/yr"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-3">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Contact & Referral Info</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Referral Contact Name</label>
                              <input
                                type="text"
                                required
                                value={jobContactName}
                                onChange={(e) => setJobContactName(e.target.value)}
                                placeholder="Marcus Brody"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Contact Phone</label>
                              <input
                                type="text"
                                value={jobContactPhone}
                                onChange={(e) => setJobContactPhone(e.target.value)}
                                placeholder="415-555-0921"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Contact Email (for Applications)</label>
                            <input
                              type="email"
                              required
                              value={jobContactEmail}
                              onChange={(e) => setJobContactEmail(e.target.value)}
                              placeholder="marcus.brody@google.com"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                          <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Description</label>
                          <textarea
                            required
                            rows={2}
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Detail the role, tasks, or application steps..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Preferred Qualifications</label>
                          <input
                            type="text"
                            value={jobRequirements}
                            onChange={(e) => setJobRequirements(e.target.value)}
                            placeholder="GPA 3.5+, computer science student"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <input
                            type="checkbox"
                            id="jobCrossPost"
                            checked={jobCrossPost}
                            onChange={(e) => setJobCrossPost(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor="jobCrossPost" className="text-[10px] text-slate-600 font-bold select-none cursor-pointer">
                            Cross-post teaser directly to Announcements feed
                          </label>
                        </div>

                        {postJobError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-1.5 text-[10px] text-red-600 leading-normal">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{postJobError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-[0.98]"
                          style={{ backgroundColor: selectedBrand.primaryColor }}
                        >
                          Submit Listing
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Posting Announcement Modal (President Alex Mercer / Brother officers) */}
              {showPostAnnModal && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex flex-col justify-end text-left" onClick={() => { setShowPostAnnModal(false); setAnnTitle(""); setAnnBody(""); setAnnPinned(false); }}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 max-h-[85%] overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 className="text-sm font-bold text-slate-955">Publish Announcement</h4>
                      </div>
                      <button
                        onClick={() => { setShowPostAnnModal(false); setAnnTitle(""); setAnnBody(""); setAnnPinned(false); }}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {postAnnSuccess ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                          <Check className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Announcement Published!</h5>
                        <p className="text-xs text-slate-500">The chapter update is now live on all feeds.</p>
                      </div>
                    ) : (
                      <form onSubmit={handlePostAnnouncement} className="space-y-4 pb-6">
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Announcement Title</label>
                          <input
                            type="text"
                            required
                            value={annTitle}
                            onChange={(e) => setAnnTitle(e.target.value)}
                            placeholder="e.g. Chapter Meeting Postponed to 8 PM"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Announcement Body</label>
                          <textarea
                            required
                            rows={4}
                            value={annBody}
                            onChange={(e) => setAnnBody(e.target.value)}
                            placeholder="Provide full details for active brothers..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <input
                            type="checkbox"
                            id="annPinned"
                            checked={annPinned}
                            onChange={(e) => setAnnPinned(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor="annPinned" className="text-[10px] text-slate-600 font-bold select-none cursor-pointer">
                            Pin to the top of the feed (Mandatory View)
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-[0.98]"
                          style={{ backgroundColor: selectedBrand.primaryColor }}
                        >
                          Publish to Chapter
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Edit Profile & Professional Info Modal */}
              {showEditProfileModal && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex flex-col justify-end text-left" onClick={() => setShowEditProfileModal(false)}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 max-h-[88%] overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 className="text-sm font-bold text-slate-955">Update Profile Information</h4>
                      </div>
                      <button
                        onClick={() => setShowEditProfileModal(false)}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-3.5 pb-8">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Phone Number</label>
                          <input
                            type="text"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="803-555-0144"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Hometown</label>
                          <input
                            type="text"
                            required
                            value={editHometown}
                            onChange={(e) => setEditHometown(e.target.value)}
                            placeholder="Charleston, SC"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>
                      </div>

                      {role === "brother" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Year</label>
                            <input
                              type="text"
                              required
                              value={editYear}
                              onChange={(e) => setEditYear(e.target.value)}
                              placeholder="Senior"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Academic Major</label>
                            <input
                              type="text"
                              required
                              value={editMajor}
                              onChange={(e) => setEditMajor(e.target.value)}
                              placeholder="Computer Science"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Current Employer</label>
                              <input
                                type="text"
                                required
                                value={editCompany}
                                onChange={(e) => setEditCompany(e.target.value)}
                                placeholder="Google"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Job Title</label>
                              <input
                                type="text"
                                required
                                value={editJobTitle}
                                onChange={(e) => setEditJobTitle(e.target.value)}
                                placeholder="Senior Software Engineer"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">City</label>
                              <input
                                type="text"
                                required
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                placeholder="San Francisco"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">State</label>
                              <input
                                type="text"
                                required
                                value={editState}
                                onChange={(e) => setEditState(e.target.value)}
                                placeholder="CA"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">LinkedIn URL</label>
                            <input
                              type="text"
                              value={editLinkedIn}
                              onChange={(e) => setEditLinkedIn(e.target.value)}
                              placeholder="https://linkedin.com/in/username"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Professional Bio / Mentorship Note</label>
                            <textarea
                              rows={2}
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="Happy to review resumes or grab a coffee with active brothers."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-[0.98]"
                        style={{ backgroundColor: selectedBrand.primaryColor }}
                      >
                        Save & Sync Profile
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Interactive demo callout — a small, dismissible text-box that
                  explains the tool on the current tab. Only in demo mode; floats
                  just above the bottom tab bar so it points at the nav the visitor
                  is exploring. Re-appears with fresh copy on every tab switch
                  until the visitor turns the tour off. */}
              {isDemo && calloutVisible && !calloutDismissed && DEMO_CALLOUTS[activeTab] && (
                <div className="absolute inset-x-3 bottom-[4.75rem] z-[60] animate-spring-in">
                  <div className="relative rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 pr-9 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.45)]">
                    {/* little pointer down toward the tab bar */}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white/95"
                    />
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: selectedBrand.primaryColor }}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-900">
                          {DEMO_CALLOUTS[activeTab].title}
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                            What this does
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {DEMO_CALLOUTS[activeTab].body}
                        </p>
                        <button
                          onClick={() => setCalloutDismissed(true)}
                          className="mt-2 text-[10px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                        >
                          Turn off tips
                        </button>
                      </div>
                    </div>
                    {/* dismiss just this one (it returns on the next tab) */}
                    <button
                      onClick={() => setCalloutVisible(false)}
                      aria-label="Dismiss tip"
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Persistent Bottom Tab Bar Navigation */}
              <div className="h-16 shrink-0 bg-white border-t border-slate-100 flex items-center justify-around px-2 pb-1.5 shadow-lg relative z-10">
                <button
                  onClick={() => setActiveTab("feed")}
                  className="flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 rounded-2xl max-w-[64px]"
                  style={activeTab === "feed" ? { color: selectedBrand.primaryColor, backgroundColor: selectedBrand.primaryColor + '0d' } : { color: "#94A3B8" }}
                >
                  <Bell className="w-5 h-5 shrink-0" />
                  <span className="text-[9px] font-bold">Feed</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("events")}
                  className="flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 rounded-2xl max-w-[64px]"
                  style={activeTab === "events" ? { color: selectedBrand.primaryColor, backgroundColor: selectedBrand.primaryColor + '0d' } : { color: "#94A3B8" }}
                >
                  <Calendar className="w-5 h-5 shrink-0" />
                  <span className="text-[9px] font-bold">Events</span>
                </button>

                  <button
                    onClick={() => setActiveTab("rush")}
                    className="flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 rounded-2xl max-w-[64px]"
                    style={activeTab === "rush" ? { color: selectedBrand.primaryColor, backgroundColor: selectedBrand.primaryColor + '0d' } : { color: "#94A3B8" }}
                  >
                    <Users className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-bold">{isRushActive ? "Rush" : "Pledges"}</span>
                  </button>
                
                <button
                  onClick={() => setActiveTab("dues")}
                  className="flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 rounded-2xl max-w-[64px]"
                  style={activeTab === "dues" ? { color: selectedBrand.primaryColor, backgroundColor: selectedBrand.primaryColor + '0d' } : { color: "#94A3B8" }}
                >
                  {role === "brother" ? (
                    <>
                      <DollarSign className="w-5 h-5 shrink-0" />
                      <span className="text-[9px] font-bold">Dues</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 shrink-0" />
                      <span className="text-[9px] font-bold">Giving</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab("directory")}
                  className="flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 rounded-2xl max-w-[64px]"
                  style={activeTab === "directory" ? { color: selectedBrand.primaryColor, backgroundColor: selectedBrand.primaryColor + '0d' } : { color: "#94A3B8" }}
                >
                  <Globe className="w-5 h-5 shrink-0" />
                  <span className="text-[9px] font-bold">Network</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Home Screen bar for mobile device shell */}
        <div className="hidden md:block h-6 shrink-0 bg-white relative">
          <div className="w-32 h-1 rounded-full bg-slate-300 absolute bottom-1.5 left-1/2 -translate-x-1/2" />
        </div>
      </div>
    </div>
  </div>
);
}
