import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { AddServiceDto } from './dto/service-file.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('temperatures')
  async getTemps(): Promise<string> {
    return await this.appService.getTemps();
    // return res.status(HttpStatus.OK).json(result);
  }

  @Get('restart_plex_services')
  async restartPlexServices(@Res() res): Promise<string> {
    const result = await this.appService.restartPlexServices();
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('deploy_project')
  async buildProject(
    @Res() res,
    @Body() body: Record<string, string>,
  ): Promise<string> {
    const result = await this.appService.buildProject(body.projectName);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('create_service')
  async createService(
    @Res() res,
    @Body() addServiceDto: AddServiceDto,
  ): Promise<string> {
    const result = await this.appService.createService(addServiceDto);
    return res.status(HttpStatus.OK).json(result);
  }

  @Post('remove_service')
  async removeService(
    @Res() res,
    @Body() removeService: Record<string, string>,
  ): Promise<string> {
    const result = await this.appService.removeService(removeService);
    return res.status(HttpStatus.OK).json(result);
  }
}
