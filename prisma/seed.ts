import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting existing data...');
  await prisma.template.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Existing data deleted successfully');

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
   * 템플릿 3: 이메일 작성 예시
   */
  await prisma.template.create({
    data: {
      creatorId: user.id,
      title: '이메일 작성',
      description: null,
      content: '비즈니스 이메일 예시를 보여주세요.',
      variable: [],
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
