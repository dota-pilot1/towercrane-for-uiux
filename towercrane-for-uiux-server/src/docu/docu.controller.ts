import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocuService } from './docu.service';

type UserCtx = { id: string; role: string };

@Controller('docu')
@UseGuards(AuthGuard)
export class DocuController {
  constructor(private readonly docuService: DocuService) {}

  @Get('prototypes/:prototypeId/tree')
  getTree(
    @CurrentUser() user: UserCtx,
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.docuService.getTree(user.id, user.role, prototypeId);
  }

  @Post('prototypes/:prototypeId/sections')
  createSection(
    @CurrentUser() user: UserCtx,
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.createSection(
      user.id,
      user.role,
      prototypeId,
      body,
    );
  }

  @Patch('prototypes/:prototypeId/sections/reorder')
  reorderSections(
    @CurrentUser() user: UserCtx,
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.reorderSections(
      user.id,
      user.role,
      prototypeId,
      body,
    );
  }

  @Patch('sections/:sectionId')
  updateSection(
    @CurrentUser() user: UserCtx,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.updateSection(user.id, user.role, sectionId, body);
  }

  @Delete('sections/:sectionId')
  deleteSection(
    @CurrentUser() user: UserCtx,
    @Param('sectionId') sectionId: string,
  ) {
    return this.docuService.deleteSection(user.id, user.role, sectionId);
  }

  @Post('sections/:sectionId/documents')
  createDocument(
    @CurrentUser() user: UserCtx,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.createDocument(user.id, user.role, sectionId, body);
  }

  @Patch('sections/:sectionId/documents/reorder')
  reorderDocuments(
    @CurrentUser() user: UserCtx,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.reorderDocuments(
      user.id,
      user.role,
      sectionId,
      body,
    );
  }

  @Patch('documents/:documentId')
  updateDocument(
    @CurrentUser() user: UserCtx,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.updateDocument(
      user.id,
      user.role,
      documentId,
      body,
    );
  }

  @Delete('documents/:documentId')
  deleteDocument(
    @CurrentUser() user: UserCtx,
    @Param('documentId') documentId: string,
  ) {
    return this.docuService.deleteDocument(user.id, user.role, documentId);
  }

  @Get('documents/:documentId')
  getDocument(
    @CurrentUser() user: UserCtx,
    @Param('documentId') documentId: string,
  ) {
    return this.docuService.getDocumentDetail(user.id, user.role, documentId);
  }

  @Put('documents/:documentId/blocks')
  replaceBlocks(
    @CurrentUser() user: UserCtx,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ) {
    return this.docuService.replaceBlocks(
      user.id,
      user.role,
      documentId,
      body,
    );
  }
}
