import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { DisputesService } from './disputes.service';
import { AddNoteDto, AssignDisputeDto, OpenDisputeDto, ResolveDisputeDto } from './dto/dispute.dto';
import { DisputeSeverity, DisputeStatus } from './enums/dispute.enum';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post()
  open(@Body() dto: OpenDisputeDto, @User('id') userId: string) {
    return this.service.open(dto, userId);
  }

  @Get()
  list(
    @Query('status') status?: DisputeStatus,
    @Query('severity') severity?: DisputeSeverity,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.service.list({ status, severity, assignedTo });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDisputeDto) {
    return this.service.assign(id, dto.operatorId);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.service.resolve(id, dto);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @User('id') userId: string) {
    return this.service.addNote(id, dto.content, userId);
  }

  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.service.getNotes(id);
  }

  @Post(':id/evidence')
  addEvidence(@Param('id') id: string, @Body() body: { type: string; url: string }) {
    return this.service.addEvidence(id, body);
  }
}
