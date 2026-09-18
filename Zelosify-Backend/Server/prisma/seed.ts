import { PrismaClient, Role, OpeningStatus, AuthProvider } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Ensure Tenant: Bruce Wayne Corp
  let tenant = await prisma.tenants.findFirst({
    where: { companyName: "Bruce Wayne Corp" },
  });

  if (!tenant) {
    tenant = await prisma.tenants.create({
      data: {
        companyName: "Bruce Wayne Corp",
      },
    });
    console.log(`Created Tenant: ${tenant.companyName} (${tenant.tenantId})`);
  } else {
    console.log(`Using existing Tenant: ${tenant.companyName} (${tenant.tenantId})`);
  }

  // 2. Ensure Hiring Manager User
  let hiringManager = await prisma.user.findFirst({
    where: { email: "hiring.manager@waynecorp.com" },
  });

  if (!hiringManager) {
    hiringManager = await prisma.user.create({
      data: {
        username: "hiring.manager",
        email: "hiring.manager@waynecorp.com",
        firstName: "Lucius",
        lastName: "Fox",
        department: "Engineering & Applied Sciences",
        role: Role.HIRING_MANAGER,
        tenantId: tenant.tenantId,
        externalId: "hm-lucius-fox-001",
        profileComplete: true,
        provider: AuthProvider.KEYCLOAK,
      },
    });
    console.log(`Created Hiring Manager: ${hiringManager.firstName} ${hiringManager.lastName} (${hiringManager.id})`);
  } else {
    console.log(`Using existing Hiring Manager: ${hiringManager.firstName} ${hiringManager.lastName} (${hiringManager.id})`);
  }

  // 3. Ensure IT Vendor User
  let itVendor = await prisma.user.findFirst({
    where: { email: "it.vendor@waynecorp.com" },
  });

  if (!itVendor) {
    itVendor = await prisma.user.create({
      data: {
        username: "it.vendor",
        email: "it.vendor@waynecorp.com",
        firstName: "Alfred",
        lastName: "Pennyworth",
        department: "Vendor Logistics",
        role: Role.IT_VENDOR,
        tenantId: tenant.tenantId,
        externalId: "vendor-alfred-001",
        profileComplete: true,
        provider: AuthProvider.KEYCLOAK,
      },
    });
    console.log(`Created IT Vendor: ${itVendor.firstName} ${itVendor.lastName} (${itVendor.id})`);
  } else {
    console.log(`Using existing IT Vendor: ${itVendor.firstName} ${itVendor.lastName} (${itVendor.id})`);
  }

  // 4. Seed >= 12 Diverse Openings
  const openingsData = [
    {
      title: "Senior Full-Stack Engineer",
      description: "Design and implement scalable microservices and responsive web platforms using TypeScript, Node.js, Next.js, and PostgreSQL. Experience with cloud deployments and clean architecture required.",
      location: "Remote",
      contractType: "C2C",
      experienceMin: 5,
      experienceMax: 10,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Lead Cloud Infrastructure Architect",
      description: "Oversee enterprise cloud architecture on AWS. Direct container orchestration with Kubernetes, IaC with Terraform, and robust multi-region high availability architectures.",
      location: "Gotham City",
      contractType: "12-Month Contract",
      experienceMin: 8,
      experienceMax: 15,
      status: OpeningStatus.OPEN,
    },
    {
      title: "AI / Machine Learning Research Engineer",
      description: "Develop generative AI workflows, tool-calling LLM agents, and semantic retrieval systems using Python, PyTorch, LangChain/LlamaIndex, and Hugging Face models.",
      location: "Remote",
      contractType: "W2",
      experienceMin: 4,
      experienceMax: 8,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Backend Platform Engineer",
      description: "Build ultra-low latency distributed messaging backends with Go, gRPC, Redis, Kafka, and PostgreSQL. High concurrency and performance optimization experience essential.",
      location: "New York, NY",
      contractType: "C2C",
      experienceMin: 3,
      experienceMax: 7,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Senior Frontend Engineer",
      description: "Lead development of rich dashboard interfaces using Next.js 14, React, TailwindCSS, Zustand/Redux, and data visualization libraries. Focus on accessibility and 60fps rendering.",
      location: "Remote",
      contractType: "6-Month Contract",
      experienceMin: 4,
      experienceMax: 8,
      status: OpeningStatus.OPEN,
    },
    {
      title: "DevOps & Security Specialist",
      description: "Automate zero-trust deployment pipelines, integrate DevSecOps tooling (SonarQube, Trivy, Vault), and manage AWS IAM policies and compliance audits.",
      location: "Austin, TX",
      contractType: "C2C",
      experienceMin: 5,
      experienceMax: 10,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Data Platform Engineer",
      description: "Construct and optimize large-scale real-time data ingestion pipelines using Apache Spark, Kafka, Snowflake, and dbt. Solid SQL and Python data modeling skills required.",
      location: "Remote",
      contractType: "W2",
      experienceMin: 3,
      experienceMax: 6,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Embedded Systems & Hardware Security Engineer",
      description: "Develop secure firmware and cryptographic protocols on embedded microcontrollers (ARM Cortex, ESP32) with C/C++, RTOS, and hardware root-of-trust.",
      location: "Gotham City",
      contractType: "12-Month Contract",
      experienceMin: 6,
      experienceMax: 12,
      status: OpeningStatus.OPEN,
    },
    {
      title: "QA Automation & Performance Architect",
      description: "Build robust automated testing frameworks for end-to-end regression and high-load stress testing using Playwright, Jest, k6, and Cypress.",
      location: "Remote",
      contractType: "C2C",
      experienceMin: 4,
      experienceMax: 8,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Mobile Solutions Developer",
      description: "Create cross-platform enterprise mobile applications using React Native, TypeScript, native iOS/Android bridge modules, and offline SQLite synchronization.",
      location: "San Francisco, CA",
      contractType: "6-Month Contract",
      experienceMin: 3,
      experienceMax: 6,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Site Reliability Engineer (SRE)",
      description: "Maintain 99.99% system availability across distributed microservices. Instrument OpenTelemetry, Prometheus, and Grafana alerting while leading automated chaos engineering.",
      location: "Remote",
      contractType: "C2C",
      experienceMin: 5,
      experienceMax: 9,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Enterprise Solutions Architect",
      description: "Define technical vision and cross-domain system integration blueprints for Fortune 500 integrations. Requires deep expertise in TOGAF, DDD, and event-driven architectures.",
      location: "New York, NY",
      contractType: "12-Month Contract",
      experienceMin: 10,
      experienceMax: 18,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Cybersecurity Incident Response Lead",
      description: "Lead enterprise incident response and red team forensics. Conduct threat hunting across cloud logs, SIEM telemetry, and implement rapid zero-day vulnerability mitigations.",
      location: "Gotham City",
      contractType: "W2",
      experienceMin: 5,
      experienceMax: 10,
      status: OpeningStatus.OPEN,
    },
    {
      title: "Web3 & Smart Contract Engineer",
      description: "Implement audited smart contracts in Solidity and Rust, integrating EVM networks, zero-knowledge proofs, and decentralized identity standards.",
      location: "Remote",
      contractType: "C2C",
      experienceMin: 3,
      experienceMax: 7,
      status: OpeningStatus.OPEN,
    },
  ];

  console.log(`Checking existing openings for tenant ${tenant.tenantId}...`);
  const existingCount = await prisma.opening.count({
    where: { tenantId: tenant.tenantId },
  });

  if (existingCount < openingsData.length) {
    for (const op of openingsData) {
      const existing = await prisma.opening.findFirst({
        where: {
          tenantId: tenant.tenantId,
          title: op.title,
        },
      });

      if (!existing) {
        await prisma.opening.create({
          data: {
            ...op,
            tenantId: tenant.tenantId,
            hiringManagerId: hiringManager.id,
          },
        });
        console.log(`  + Seeded opening: "${op.title}" [${op.contractType}, ${op.location}]`);
      }
    }
  }

  const finalCount = await prisma.opening.count({
    where: { tenantId: tenant.tenantId },
  });
  console.log(`✅ Seeding complete! Total openings under ${tenant.companyName}: ${finalCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
