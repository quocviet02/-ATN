/**
 * Migration: Create a "Personal" organization for each existing user,
 * assign their projects to it, and create a "Default" department.
 *
 * Run: node src/scripts/migrateOrganizations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const connectDB          = require('../config/database');
const { User, Project, Organization, Department, OrganizationMember, ProjectMember } = require('../models');

async function migrate() {
  await connectDB();
  console.log('[Migration] Connected to DB');

  const users = await User.find({});
  console.log(`[Migration] Processing ${users.length} users...`);

  for (const user of users) {
    try {
      // Check if personal org already exists
      let org = await Organization.findOne({ createdBy: user._id, name: `${user.name}'s Organization` })
        .setOptions({ deletedAt: { $in: [null, undefined] } });

      if (!org) {
        // Create personal org
        org = new Organization({
          name:        `${user.name}'s Organization`,
          description: 'Personal workspace',
          industry:    'other',
          size:        '1-10',
          country:     'Vietnam',
          createdBy:   user._id,
          ownerId:     user._id,
        });
        // Manually set slug to avoid conflicts
        org.slug = `personal-${user._id.toString()}`;
        await org.save();
        console.log(`  [+] Created org for user: ${user.email}`);
      } else {
        console.log(`  [~] Org already exists for user: ${user.email}`);
      }

      // Ensure owner membership
      const existingMembership = await OrganizationMember.findOne({
        organizationId: org._id,
        userId:         user._id,
      });

      if (!existingMembership) {
        await OrganizationMember.create({
          organizationId: org._id,
          userId:         user._id,
          orgRole:        'owner',
          status:         'active',
          joinedAt:       new Date(),
        });
      }

      // Create default department
      let dept = await Department.findOne({ organizationId: org._id, name: 'Mặc định' });
      if (!dept) {
        dept = await Department.create({
          organizationId: org._id,
          name:           'Mặc định',
          description:    'Phòng ban mặc định',
        });
      }

      // Assign existing projects
      const memberships = await ProjectMember.find({ user: user._id });
      const ownedProjectIds = memberships.filter(m => m.role === 'owner').map(m => m.projectId);

      const updated = await Project.updateMany(
        { _id: { $in: ownedProjectIds }, organizationId: null },
        { $set: { organizationId: org._id, departmentId: dept._id } }
      );

      if (updated.modifiedCount > 0) {
        console.log(`  [+] Assigned ${updated.modifiedCount} projects to org for: ${user.email}`);
      }
    } catch (e) {
      console.error(`  [!] Error processing user ${user.email}:`, e.message);
    }
  }

  console.log('[Migration] Done!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('[Migration] Fatal error:', e);
  process.exit(1);
});
