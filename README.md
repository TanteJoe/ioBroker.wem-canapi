![Logo](admin/wem-canapi.png)
# ioBroker.wem-canapi

[![NPM version](https://img.shields.io/npm/v/iobroker.wem-canapi.svg)](https://www.npmjs.com/package/iobroker.wem-canapi)
[![Downloads](https://img.shields.io/npm/dm/iobroker.wem-canapi.svg)](https://www.npmjs.com/package/iobroker.wem-canapi)
![Number of Installations](https://iobroker.live/badges/wem-canapi-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/wem-canapi-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.wem-canapi.png?downloads=true)](https://nodei.co/npm/iobroker.wem-canapi/)

**Tests:** ![Test and Release](https://github.com/TanteJoe/ioBroker.wem-canapi/workflows/Test%20and%20Release/badge.svg)

## wem-canapi adapter for ioBroker

Get Values directly from the Weishaupt devices via CanAPI

Local ioBroker integration for Weishaupt heating systems. The integration communicates directly with the Weishaupt system device (SG) over the local LAN and reads heating data through the CanApiJson JSON interface. No cloud connection is required.

>[!Warning]
>Use this integration at your own risk. Some entities can write values to the heating system. Always verify changes directly on your installation.

## Disclaimer
This is an independent, community-developed integration with no affiliation to Weishaupt GmbH.

Starting with version v0.0.2, the integration can write selected values to the heating system, including operating modes and domestic-hot-water actions. Incorrect values or unexpected device behavior may cause loss of heating, loss of hot water, malfunction, or other damage.

The authors and contributors accept no responsibility or liability for damage, malfunction, data loss, voided warranty, or any other consequence arising from the use of this integration.

## Supported Hardware
### Tested and intended for:

Weishaupt Systemgerät 2.5 / 2.6
Article numbers: 48301122172, 48301122242, 48301122512, 48301122522
Heating systems controlled through the Weishaupt Systemgerät, including WTC gas boilers and installations with additional heating-circuit modules
Other installations may work, but register availability depends on the installed modules and firmware.

## Prerequisites
Connect the Weishaupt Systemgerät to the local network using RJ-45.
Enable the JSON interface in the Systemgerät settings. **
Determine the IP address or hostname of the Systemgerät.
Use the configured HTTP Basic Authentication credentials.
Default values on many installations:

Hostname: wem-sg
Username: admin
Password: Admin123
Example test URL:

http://admin:Admin123@wem-sg/ajax/CanApiJson.json
> [!IMPORTANT]
>To use this integration, the WEM Portal connection must be disabled. The Weishaupt Systemgerät does not allow simultaneous use of the WEM Portal cloud service and the local CanApiJson interface.

### **Enable the JSON Interface

The CanApiJson interface is disabled by default on many installations and must be enabled directly on the Weishaupt Systemgerät.

#### Step 1 — Open the service menu

From the home screen, navigate to the service menu (wrench icon).

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_01.png" width="400">

Select the installer/service level.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_02.png" width="400">

#### Step 2 — Log in as installer

Enter the installer password.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_03.png" width="400">

After successful login, the installer menu will be displayed.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_04.png" width="400">

#### Step 3 — Open commissioning settings

Select **Commissioning**.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_05.png" width="400">

Navigate to **Network**.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_06.png" width="400">

#### Step 4 — Enable the JSON interface

Open **JSON Interface**.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_07.png" width="400">

Set **JSON Interface** to **On**.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_08.png" width="400">

The JSON interface is now enabled.

#### Step 5 — Disable WEM Portal

Return to the user settings menu.

Open **Settings**.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_09.png" width="400">

Select **WEM Portal**.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_10.png" width="400">

Disable the WEM Portal connection.

<img src="https://raw.githubusercontent.com/TanteJoe/ioBroker.wem-canapi/refs/heads/main/doc/images/enable_json_11.png" width="400">


>[!IMPORTANT]
> The local CanApiJson interface used by this integration only works when the WEM Portal connection is disabled.
> If WEM Portal is enabled, the Systemgerät reserves the communication channel for the cloud connection and ioBroker will not be able to communicate with the controller.
> You must choose either:
> WEM Portal (Cloud Access), or
> ioBroker via CanApiJson (Local Access)
> Simultaneous operation is not supported by the Systemgerät firmware.

Verify Connectivity
After enabling the JSON interface and disabling WEM Portal, verify that:

The Systemgerät is connected to the local network.
ioBroker can reach the Systemgerät IP address.
TCP port 80 is reachable from the ioBroker host.
The configured IP address in the integration matches the Systemgerät.
Once these requirements are met, the integration can be added to ioBroker.

## Changelog
### 0.1.0 (2026-11-23)
* (TanteJoe) Fixing Connection Test
* (TantaJoe) make RequestBatchSize configurable
* (TanteJoe) Translation Errors

### 0.0.4 (2026-11-22)
* (TanteJoe) Verify. Datapoints
* (TanteJoe) Disable Datapoints on 5 Errors
* (TanteJoe) Reset disabled Datapoint
* (TanteJoe) Transaltion integrated

### 0.0.3 (2026-11-17)
* (TanteJoe) First Working release with CSV Datapoints untested

### 0.0.2 (2026-11-16)
* (TanteJoe) initial release

## License
MIT License

Copyright (c) 2026 TanteJoe <github@schubel.info>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
