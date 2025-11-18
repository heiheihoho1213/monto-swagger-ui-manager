import { Component, HostBinding, OnInit } from '@angular/core';

@Component({
  selector: 'app-right-nav',
  templateUrl: './right-nav.component.html',
  styleUrls: ['./right-nav.component.less'],
})
export class RightNavComponent implements OnInit {
  // 设置宽度
  @HostBinding('style.width') get width(): string {
    return '220px';
  }

  constructor() { }

  ngOnInit(): void { }
}
