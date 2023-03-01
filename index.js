const os = require("os");
const { exec } = require("child_process");
const axios = require("axios");

const webhookUrl = "";

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
  "HKLM\\SOFTWARE\\VMware, Inc.\\VMware Tools",
  "HKLM\\SOFTWARE\\VMware, Inc.\\VMwareHostOpen",
  "HKLM\\SOFTWARE\\VMware, Inc.\\VMware VGAuth",
  "HKLM\\SOFTWARE\\RegisteredApplications\\VMware Host Open",
];

async function Send(message) {
  const payload = {
    content: message,
  };

  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {}
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

    let foundKey = false;
    for (let key of registryKeys) {
      exec(`reg query "${key}" 2>nul`, (error, stdout, stderr) => {
        if (stdout && !foundKey) {
          foundKey = true;
          resolve(true);
        }
      });
    }

    resolve(false);
  });
}

async function main() {
  if (await isRunningInVM()) {
    Send("Detected");
    process.exit(1);
  } else {
    Send("No detection");
  }
}

main().catch((err) => {
  console.error(err);
});
