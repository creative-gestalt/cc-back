import { Injectable } from '@nestjs/common';
import * as util from 'util';
import { AddServiceDto } from './dto/service-file.dto';
import { EventsGateway } from './events/events.gateway';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exec = util.promisify(require('child_process').exec);

@Injectable()
export class AppService {
  constructor(private eventService: EventsGateway) {}

  async getTemps(): Promise<string> {
    const { stdout } = await exec('sensors -j');
    const data = JSON.parse(stdout);
    let final = `P-id:      ${data['coretemp-isa-0000']['Package id 0']['temp1_input']} °C\n`;
    final += `Core 0:  ${data['coretemp-isa-0000']['Core 0']['temp2_input']} °C\n`;
    final += `Core 1:   ${data['coretemp-isa-0000']['Core 1']['temp3_input']} °C\n`;
    final += `Fan:      ${data['applesmc-isa-0300']['Exhaust  ']['fan1_input']} rpm`;
    return final;
  }

  async restartPlexServices(): Promise<string> {
    await exec('sh ~/start.sh');
    return 'Success';
  }

  async buildProject(projectName: string): Promise<void> {
    this.eventService.getProgress('docker compose down');
    return await exec(`cd ~/Projects/${projectName} && docker compose down`, {
      shell: '/bin/bash',
    })
      .then(async () => {
        this.eventService.getProgress('git pull');
        await exec(`cd ~/Projects/${projectName} && git pull`, {
          shell: '/bin/bash',
        })
          .then(async () => {
            this.eventService.getProgress('docker compose build --force-rm');
            await exec(
              `cd ~/Projects/${projectName} && docker compose build --force-rm`,
              {
                shell: '/bin/bash',
              },
            )
              .then(async () => {
                this.eventService.getProgress('docker compose up -d');
                await exec(
                  `cd ~/Projects/${projectName} && docker compose up -d`,
                  {
                    shell: '/bin/bash',
                  },
                )
                  .then(async () => {
                    this.eventService.getProgress(
                      'docker image prune -f && docker network prune -f',
                    );
                    await exec(
                      'docker image prune -f && docker network prune -f',
                      {
                        shell: '/bin/bash',
                      },
                    )
                      .then(() => this.eventService.getProgress(''))
                      .catch((error) =>
                        this.eventService.getProgress(
                          `Error: ${error.cmd}; ${error.code}`,
                        ),
                      );
                  })
                  .catch((error) =>
                    this.eventService.getProgress(
                      `Error: ${error.cmd}; Code: ${error.code}`,
                    ),
                  );
              })
              .catch((error) =>
                this.eventService.getProgress(
                  `Error: ${error.cmd}; Code: ${error.code}`,
                ),
              );
          })
          .catch((error) =>
            this.eventService.getProgress(
              `Error: ${error.cmd}; Code: ${error.code}`,
            ),
          );
      })
      .catch((error) =>
        this.eventService.getProgress(
          `Error: ${error.cmd}; Code: ${error.code}`,
        ),
      );
  }

  async createService(service: AddServiceDto): Promise<string> {
    let serviceText = '[Unit]\n';
    serviceText += `Description=${service.name} application\n`;
    serviceText += `Documentation=http://www.${service.name}.local\n`;
    serviceText += 'After=network.target\n\n';
    serviceText += '[Service]\n';
    serviceText += 'Type=simple\n';
    serviceText += 'User=nick\n';
    serviceText += `WorkingDirectory=/home/nick/${service.workdir}\n`;
    serviceText += `ExecStart=/usr/bin/${
      service.package === 'npm'
        ? 'npm run start:prod\n'
        : `serve -s dist -l ${service.frontPort}\n`
    }`;
    serviceText += 'Restart=always\n\n';
    serviceText += '[Install]\n';
    serviceText += 'WantedBy=multi-user.target\n';
    await exec(
      `echo '${serviceText}' | sudo tee -a /usr/lib/systemd/system/${service.name}.service`,
    );
    await exec(`sudo systemctl enable ${service.name}.service`);
    await exec(`git -C ~/${service.workdir}/ pull`);
    // await exec(`npm i --prefix=~/${service.workdir}/`);
    // await exec(`npm run build --prefix=~/${service.workdir}/`);
    await exec(`sudo service ${service.name} start`);

    return 'Service Created';
  }

  async removeService(service: Record<string, string>): Promise<string> {
    return await exec(`sudo systemctl stop ${service.name}.service`)
      .then(async () => {
        await exec(`sudo systemctl disable ${service.name}.service`);
        await exec(`sudo rm /usr/lib/systemd/system/${service.name}.service`);
        await exec('sudo systemctl daemon-reload');
        await exec('sudo systemctl reset-failed');
        return 'Service Removed';
      })
      .catch((result) => {
        if (result.stderr.length > 0)
          return 'Failed stopping service, must not exist';
      });
  }
}
