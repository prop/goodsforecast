import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiService } from './api.service';

@Controller()
export class ApiController {
  constructor(private readonly svc: ApiService) {}

  @Get('locations')
  locations() {
    return this.svc.getLocations();
  }

  @Get('time-buckets')
  timeBuckets() {
    return this.svc.getTimeBuckets();
  }

  @Get('cskus')
  cskus() {
    return this.svc.getCskus();
  }

  @Get('total-info')
  totalInfo() {
    return this.svc.getTotalInfo();
  }

  @Get('map-data')
  mapData(@Query('csku') csku?: string, @Query('tb') tb?: string) {
    if (!csku || !tb) {
      throw new BadRequestException('csku and tb are required');
    }
    return this.svc.getMapData(csku, tb);
  }

  @Get('resource-balance')
  resourceBalance(
    @Query('csku') csku?: string,
    @Query('warehouse') warehouse?: string,
    @Query('tb') tb?: string
  ) {
    if (!csku || !warehouse || !tb) {
      throw new BadRequestException('csku, warehouse and tb are required');
    }
    return this.svc.getResourceBalance(csku, warehouse, tb);
  }

  @Get('movements')
  movements(
    @Query('csku') csku?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tb') tb?: string
  ) {
    if (!csku || !from || !to || !tb) {
      throw new BadRequestException('csku, from, to and tb are required');
    }
    return this.svc.getMovements(csku, from, to, tb);
  }

  @Get('final-productions')
  finalProductions(
    @Query('csku') csku?: string,
    @Query('factory') factory?: string,
    @Query('tb') tb?: string
  ) {
    if (!csku || !factory || !tb) {
      throw new BadRequestException('csku, factory and tb are required');
    }
    return this.svc.getFinalProductions(csku, factory, tb);
  }

  @Get('factory-load')
  factoryLoad(@Query('factory') factory?: string, @Query('tb') tb?: string) {
    if (!factory || !tb) {
      throw new BadRequestException('factory and tb are required');
    }
    return this.svc.getFactoryLoad(factory, tb);
  }
}
