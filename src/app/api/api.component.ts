import { Component, HostBinding, OnInit } from '@angular/core';

@Component({
  selector: 'app-api',
  templateUrl: './api.component.html',
  styleUrls: ['./api.component.less']
})
export class ApiComponent implements OnInit {
  @HostBinding('style.height') height = '100%';
  @HostBinding('style.display') display = 'flex';
  // 居中
  @HostBinding('style.justifyContent') justifyContent = 'center';
  @HostBinding('style.alignItems') alignItems = 'center';

  constructor() { }

  ngOnInit(): void {
  }

}
