import hre from "hardhat";

type Deployment = {
  address: string;
  metadata?: string;
};

type LegacyVerificationRuntime = typeof hre & {
  deployments?: { all(): Promise<Record<string, Deployment>> };
  tenderly?: { verify(args: { name: string; address: string }): Promise<void> };
};

async function main() {
  const runtime = hre as LegacyVerificationRuntime;
  const deployments = runtime.deployments;
  const tenderly = runtime.tenderly;

  if (!deployments || !tenderly) {
    throw new Error("Tenderly verification requires the Tenderly and deployment plugins to be configured");
  }

  const contracts: { name: string; address: string }[] = [];
  for (const [name, deployment] of Object.entries(await deployments.all())) {
    const metadataObj = JSON.parse(deployment.metadata!);
    const [[path, contract]] = Object.entries(metadataObj.settings.compilationTarget);
    const artifact = `${path}:${contract}`;

    const address = deployment.address;
    contracts.push({ name: artifact, address });
    console.log(`🖖🏽[Tenderly] Verifying ${name} with artifact: ${artifact} at address ${address}`);
    await tenderly.verify({
      name: artifact,
      address,
    });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
