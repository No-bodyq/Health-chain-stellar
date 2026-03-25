import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface DonorOutreachJobData {
  bloodType: string;
  region: string;
  urgency: 'critical' | 'high' | 'medium';
  projectedDaysOfSupply: number;
  requiredUnits: number;
}

@Processor('donor-outreach')
export class DonorOutreachProcessor extends WorkerHost {
  private readonly logger = new Logger(DonorOutreachProcessor.name);

  async process(job: Job<DonorOutreachJobData>): Promise<void> {
    const { bloodType, region, urgency, projectedDaysOfSupply, requiredUnits } =
      job.data;

    this.logger.log(
      `Processing donor outreach: ${bloodType} in ${region} - ` +
        `Urgency: ${urgency}, Required: ${requiredUnits} units`,
    );

    // Business Logic:
    // 1. Identify priority donors (O- is universal donor if requested type is rare)
    // 2. Filter by region proximity (mocked here)
    // 3. Trigger outreach campaign

    const recommendedDonors = await this.getRecommendedDonors(
      bloodType,
      region,
    );

    this.logger.log(
      `Found ${recommendedDonors.length} compatible donors in ${region}. ` +
        `Initiating ${urgency} outreach campaign for ${requiredUnits} units.`,
    );

    // In a real implementation, we would send notifications to these donors here.
    // await this.outreachCampaignService.start(recommendedDonors, ...);

    await this.simulateOutreach(job.data, recommendedDonors);

    this.logger.log(`Donor outreach completed for job ${job.id}`);
  }

  private async getRecommendedDonors(
    bloodType: string,
    region: string,
  ): Promise<any[]> {
    // Mock donor selection logic
    // In a real app, this would query the User table with role='donor'
    // and filter by bloodType compatibility and region.
    return [
      { id: 'donor-1', name: 'John Doe', bloodType: bloodType, score: 0.95 },
      { id: 'donor-2', name: 'Jane Smith', bloodType: 'O-', score: 0.85 }, // O- is universal
    ];
  }

  private async simulateOutreach(
    data: DonorOutreachJobData,
    donors: any[],
  ): Promise<void> {
    // Log detailed outreach plan
    this.logger.debug(`Outreach Plan for ${data.bloodType} in ${data.region}:`);
    donors.forEach((d) => {
      this.logger.debug(
        `- Notifying ${d.name} (${d.id}) due to compatibility score ${d.score}`,
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
