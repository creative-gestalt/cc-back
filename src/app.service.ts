import { Injectable } from '@nestjs/common';
// import { exec } from 'child_process';
import * as util from 'util';
import { AddServiceDto } from './dto/service-file.dto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exec = util.promisify(require('child_process').exec);

@Injectable()
export class AppService {
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

  async buildCommandCenter(): Promise<string> {
    await exec('sh ~/commandcenter_deploy.sh');
    return 'Success';
  }

  async buildDreamscape(): Promise<string> {
    await exec('sh ~/dreamscape_deploy.sh');
    return 'Success';
  }

  async buildBillTracker(): Promise<string> {
    await exec('sh ~/billtracker_deploy.sh');
    return 'Success';
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
      `echo '${serviceText}' > /usr/lib/systemd/system/${service.name}.service`,
    );
    await exec(`sudo systemctl enable ${service.name}.service`);
    await exec(`sudo service ${service.name} start`);

    return 'Service Created';
  }

  async removeService(service: Record<string, string>): Promise<string> {
    return await exec(`sudo systemctl stop ${service.name}`)
      .then(async () => {
        await exec(`sudo systemctl disable ${service.name}`);
        await exec(`sudo rm /etc/systemd/system/${service.name}`);
        await exec(`sudo rm /lib/systemd/system/${service.name}`);
        await exec(`sudo rm /usr/lib/systemd/system/${service.name}`);
        await exec('sudo systemctl daemon-reload');
        await exec('sudo systemctl reset-failed');
        return 'Service Removed';
      })
      .catch((result) => {
        if (result.stderr.length > 0)
          return 'Failed stopping service, must not exist';
      });
  }

  async remountWDBlackDrive(): Promise<string> {
    return await exec('sudo umount /dev/sdb1')
      .then(async () => {
        await exec('sudo mount /dev/sdb1 /media/WD_BLACK');
        return 'Success';
      })
      .catch((result) => {
        if (result.stderr.length > 0) return 'Failed unmounting drive';
      });
  }
}
