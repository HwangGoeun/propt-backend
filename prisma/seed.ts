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
      refreshToken: null,
    },
  });

  /**
   * 템플릿 1: 블로그 제목 생성
   */
  await prisma.template.create({
    data: {
      creatorId: user.id,
      title: '블로그 제목 생성',
      content: '{keyword}에 대한 블로그 제목을 {tone} 톤으로 3개 생성해주세요',
      variables: [
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
      content: '다음 내용을 3문장으로 요약해주세요:\n\n{content}',
      variables: [{ name: 'content', type: 'text' }],
    },
  });

  /**
   * 템플릿 3: 이메일 작성 예시
   */
  await prisma.template.create({
    data: {
      creatorId: user.id,
      title: '이메일 작성',
      content: '비즈니스 이메일 예시를 보여주세요.',
      variables: [],
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
