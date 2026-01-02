import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  /**
   * 테스트 사용자
   */
  const user = await prisma.user.create({
    data: {
      oauthProvider: 'google',
      oauthId: '1234567890',
      name: 'test_user',
      email: 'testuser@example.com',
    },
  });

  /**
   * 템플릿 1: 블로그 제목 생성
   */
  await prisma.template.create({
    data: {
      creatorId: user.id,
      title: '블로그 제목 생성',
      description: '키워드 기반으로 블로그 제목 3개 생성',
      content: '{keyword}에 대한 블로그 제목을 {tone} 톤으로 3개 생성해주세요',
      variable: [
        { name: 'keyword', type: 'text' },
        { name: 'tone', type: 'text' },
      ],
    },
  });

  /**
   * 템플릿 2: 콘텐츠 요약
   */
  await prisma.template.create({
    data: {
      creatorId: user.id,
      title: '콘텐츠 요약',
      description: '긴 텍스트를 간단하게 요약',
      content: '다음 내용을 3문장으로 요약해주세요:\n\n{content}',
      variable: [{ name: 'content', type: 'text' }],
    },
  });

  /**
   * 템플릿 3: 이메일 작성
   */
  await prisma.template.create({
    data: {
      creatorId: user.id,
      title: '이메일 작성',
      description: '비즈니스 이메일 자동 생성',
      content: '{recipient}님께 보낼 {purpose} 관련 이메일을 {tone} 톤으로 작성해주세요',
      variable: [
        { name: 'recipient', type: 'text' },
        { name: 'purpose', type: 'text' },
        { name: 'tone', type: 'text' },
      ],
    },
  });

  console.log('Seed data inserted successfully');
  console.log(`User created: ${user.id}`);
  console.log('3 templates created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
