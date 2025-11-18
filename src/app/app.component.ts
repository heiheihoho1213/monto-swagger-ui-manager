import { AfterViewInit, Component, HostBinding, OnInit } from '@angular/core';
import { StoreService } from './share/service/store/store.service';

@Component({
  selector: 'app-monto-swagger-ui-manager',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
})
export class AppComponent implements OnInit, AfterViewInit {
  @HostBinding('class.mat-app-background')
  title = 'monto-swagger-ui-manager';

  constructor(private store: StoreService) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.store.init();
    }, 500);
  }

  parseFiles(fileList: FileList): void {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      this.store.parseFile(file).finally(() => { });
    }
  }
}
